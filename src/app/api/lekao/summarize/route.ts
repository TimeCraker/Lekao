// ============================================
// Lekao · 课堂小结/反馈 API 路由（阶段 4 · 扣费 + 落盘）
// ============================================
// 流程：
// 1. Auth + 用户级 Rate Limit
// 2. ⭐ 全局并发限流（2026-06-22 PRD §9 P1 补漏 · 5 并发 + 队列 + 60s 超时）
// 3. 请求体大小 + 参数校验
// 4. 扣费前置（阶段 4 · 先 lekao_gift_coin → 再 t_coin）
// 5. 视觉识别（Qwen3-VL-8B）
// 6. 文本生成流式返回（deepseek-v4-flash）
// 7. 落盘 lekao_class_summaries / lekao_class_feedbacks
//
// ⭐ 扣费失败：返回 402 + 友好提示，不调 AI
// ⭐ 落盘失败：仅 console.error，不影响用户（已扣费 + 已交付）
// ⭐ 并发限流：失败不扣费不调 AI；超限返回 503 + Retry-After

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "node:crypto";
import { authOptions } from "@/lib/auth";
import { recognizeHandout } from "@/lib/ai/vision";
import { generateStream } from "@/lib/ai/text";
import { parseSummaryOutput } from "@/lib/summary/parser";
import { deductCoin } from "@/lib/coin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

// ============================================
// 安全常量
// ============================================
const MAX_BODY_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGES_COUNT = 10;
const RATE_LIMIT_PER_USER = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// ============================================
// ⭐ 全局并发限流 semaphore（2026-06-22）
// 单实例 in-memory 够用（lekao 单进程）；多实例时再换 Redis
// ============================================
const MAX_CONCURRENT_REQUESTS = 5;
const CONCURRENCY_QUEUE_TIMEOUT_MS = 60 * 1000;
let activeRequests = 0;
interface QueueItem {
  resolve: () => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}
const concurrencyQueue: QueueItem[] = [];

async function acquireConcurrencySlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++;
    return;
  }
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      const idx = concurrencyQueue.findIndex((q) => q.resolve === wrappedResolve);
      if (idx >= 0) concurrencyQueue.splice(idx, 1);
      reject(new Error("CONCURRENCY_TIMEOUT"));
    }, CONCURRENCY_QUEUE_TIMEOUT_MS);
    const wrappedResolve = () => {
      clearTimeout(timer);
      activeRequests++;
      resolve();
    };
    concurrencyQueue.push({ resolve: wrappedResolve, reject, timer });
  });
}

function releaseConcurrencySlot() {
  activeRequests--;
  if (concurrencyQueue.length > 0) {
    const next = concurrencyQueue.shift()!;
    next.resolve();
  }
}

// ============================================
// 用户级 Rate Limit（每用户 5 次 / 60s）
// ============================================
const rateLimitStore = new Map<string, number[]>();

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitStore.get(email) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (timestamps.length >= RATE_LIMIT_PER_USER) return false;
  timestamps.push(now);
  rateLimitStore.set(email, timestamps);
  return true;
}

function getRateLimitRetryAfter(email: string): number {
  const timestamps = rateLimitStore.get(email) || [];
  if (timestamps.length === 0) return 0;
  const oldest = Math.min(...timestamps);
  return Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - Date.now()) / 1000);
}

function estimateBase64Bytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(",");
  const data = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  return Math.floor((data.length * 3) / 4);
}

type RequestBody = {
  images: string[];
  template: "summary" | "feedback";
  className?: string;
  date: string;
  feedbackCount?: number;
  feedbackLength?: "short" | "standard" | "long";
  contentSections?: number;
  requirementCount?: number;
  showFeedback?: boolean;
};

// ============================================
// 主路由
// ============================================
export async function POST(req: NextRequest) {
  const correlationId = `lekao-${randomUUID()}`;

  // 1. Auth
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session.user.id) {
    return jsonError(401, "未登录，请先登录后再生成小结/反馈", correlationId);
  }
  const userId = session.user.id;
  const userEmail = session.user.email;

  // 2. 用户级 Rate Limit
  if (!checkRateLimit(userEmail)) {
    const retryAfter = getRateLimitRetryAfter(userEmail);
    return new Response(
      JSON.stringify({
        error: `请求过于频繁，${retryAfter} 秒后再试`,
        correlationId,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  // 3. ⭐ 全局并发限流（多用户并发保护）— 失败不扣费不调 AI
  let acquired = false;
  try {
    await acquireConcurrencySlot();
    acquired = true;
  } catch (err) {
    if (err instanceof Error && err.message === "CONCURRENCY_TIMEOUT") {
      const queueLen = concurrencyQueue.length;
      console.warn(
        `[${correlationId}] 全局并发队列超时: 队列长度=${queueLen}, 等待 ${CONCURRENCY_QUEUE_TIMEOUT_MS / 1000}s`,
      );
      return new Response(
        JSON.stringify({
          error: `服务器繁忙，当前排队 ${queueLen} 个请求，请 ${Math.ceil(CONCURRENCY_QUEUE_TIMEOUT_MS / 1000)}s 后重试`,
          correlationId,
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(CONCURRENCY_QUEUE_TIMEOUT_MS / 1000)),
          },
        },
      );
    }
    throw err;
  }

  // ⭐ try/finally 确保并发槽位一定释放（任何 return/throw 路径）
  try {
    return await handleSummarize(req, userId, correlationId);
  } finally {
    if (acquired) releaseConcurrencySlot();
  }
}

async function handleSummarize(
  req: NextRequest,
  userId: string,
  correlationId: string,
): Promise<Response> {
  // 4. 请求体大小限制
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return jsonError(413, `请求体超过 ${MAX_BODY_BYTES / 1024 / 1024} MB 上限`, correlationId);
  }

  // 5. 参数校验
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "请求体不是合法 JSON", correlationId);
  }

  if (!body.images || !Array.isArray(body.images) || body.images.length === 0) {
    return jsonError(400, "至少上传 1 张讲义图片", correlationId);
  }
  if (body.images.length > MAX_IMAGES_COUNT) {
    return jsonError(400, `最多 ${MAX_IMAGES_COUNT} 张图片`, correlationId);
  }
  for (let i = 0; i < body.images.length; i++) {
    const img = body.images[i];
    if (typeof img !== "string" || !img.startsWith("data:image/")) {
      return jsonError(400, `第 ${i + 1} 张图不是合法图片`, correlationId);
    }
    const bytes = estimateBase64Bytes(img);
    if (bytes > MAX_IMAGE_BYTES) {
      return jsonError(413, `第 ${i + 1} 张图超过 ${MAX_IMAGE_BYTES / 1024 / 1024} MB`, correlationId);
    }
  }
  if (!["summary", "feedback"].includes(body.template)) {
    return jsonError(400, "template 必须是 summary 或 feedback", correlationId);
  }

  // 6. 扣费前置（PRD §5.2.2）
  const deductResult = await deductCoin(userId);
  if (!deductResult.success) {
    if (deductResult.reason === "insufficient") {
      return jsonError(402, "T-Coin 余额不足，请充值后再试", correlationId);
    }
    return jsonError(404, "用户不存在", correlationId);
  }

  // 7. 视觉识别
  let visionResult;
  try {
    visionResult = await recognizeHandout(body.images);
  } catch (err) {
    console.error(`[${correlationId}] 视觉识别失败:`, err);
    return jsonError(500, "AI provider call failed", correlationId);
  }

  // 8. 文本生成（流式）
  try {
    const stream = generateStream({
      subject: visionResult.subject,
      topic: visionResult.topic,
      keyPoints: visionResult.keyPoints,
      template: body.template,
      className: body.className,
      date: body.date,
      feedbackCount: body.template === "feedback" ? body.feedbackCount : undefined,
      feedbackLength: body.template === "feedback" ? body.feedbackLength : undefined,
      contentSections: body.template === "summary" ? body.contentSections : undefined,
      requirementCount: body.template === "summary" ? body.requirementCount : undefined,
      showFeedback: body.template === "summary" ? body.showFeedback : undefined,
    });

    const encoder = new TextEncoder();
    const wrappedStream = new ReadableStream({
      async start(controller) {
        const meta = `__META__${JSON.stringify({
          subject: visionResult.subject,
          topic: visionResult.topic,
          keyPoints: visionResult.keyPoints,
          rawText: visionResult.rawText,
          coinDeducted: {
            source: deductResult.source,
            newGift: deductResult.newGift,
            newPaid: deductResult.newPaid,
          },
        })}\n\n`;
        controller.enqueue(encoder.encode(meta));

        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            accumulated += chunk;
            controller.enqueue(value);
          }

          // 落盘（PRD §7.6 防客诉）
          try {
            const parsed = parseSummaryOutput(accumulated, body.template);
            if (body.template === "summary") {
              await prisma.lekaoClassSummary.create({
                data: {
                  userId,
                  subject: visionResult.subject,
                  topic: visionResult.topic,
                  feedbackText: parsed.feedback,
                  summaryText: parsed.summary,
                  tCoinUsed: 1,
                },
              });
            } else {
              await prisma.lekaoClassFeedback.create({
                data: {
                  userId,
                  subject: visionResult.subject,
                  topic: visionResult.topic,
                  feedbackText: parsed.feedback,
                  description: parsed.summary || null,
                  tCoinUsed: 1,
                },
              });
            }
            console.log(
              `[${correlationId}] 落盘成功: ${body.template} ${visionResult.subject}/${visionResult.topic}`,
            );
          } catch (persistErr) {
            console.error(`[${correlationId}] 落盘失败:`, persistErr);
          }

          controller.close();
        } catch (err) {
          console.error(`[${correlationId}] 文本生成流错误:`, err);
          controller.error(err);
        }
      },
    });

    return new Response(wrappedStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error(`[${correlationId}] 文本生成失败:`, err);
    return jsonError(500, "AI provider call failed", correlationId);
  }
}

function jsonError(status: number, error: string, correlationId: string): Response {
  return new Response(
    JSON.stringify({ error, correlationId }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}