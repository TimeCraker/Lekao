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
const MAX_IMAGES_COUNT = 5;
const RATE_LIMIT_PER_USER = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// ============================================
// ⭐ 全局并发限流 semaphore（2026-06-22）
// ⚠️ 命名明确: PER_INSTANCE 表示本进程内计数
//    lekao 是 systemd 管理的单进程 = 安全
//    若以后多实例 (cluster / k8s), 需切到 Redis (原子 INCR/DECR + TTL)
// ============================================
const MAX_CONCURRENT_REQUESTS_PER_INSTANCE = 5;
const CONCURRENCY_QUEUE_TIMEOUT_MS = 60 * 1000;
const CONCURRENCY_QUEUE_MAX = 100; // 队列硬上限防 OOM
let activeRequests = 0;
interface QueueItem {
  resolve: () => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  onAbort?: () => void;
}
const concurrencyQueue: QueueItem[] = [];

async function acquireConcurrencySlot(signal?: AbortSignal): Promise<void> {
  if (activeRequests < MAX_CONCURRENT_REQUESTS_PER_INSTANCE) {
    activeRequests++;
    return;
  }

  // 队列已满 → 立即拒, 防止 OOM
  if (concurrencyQueue.length >= CONCURRENCY_QUEUE_MAX) {
    throw new Error("CONCURRENCY_QUEUE_FULL");
  }

  return new Promise<void>((resolve, reject) => {
    // ⚠️ wrappedResolve 在 setTimeout 前定义 (让 abort handler 能引用)
    const item: QueueItem = {
      resolve: () => {},
      reject: () => {},
      timer: setTimeout(() => {
        removeFromQueue(item);
        reject(new Error("CONCURRENCY_TIMEOUT"));
      }, CONCURRENCY_QUEUE_TIMEOUT_MS),
    };
    item.resolve = () => {
      clearTimeout(item.timer);
      if (item.onAbort) signal?.removeEventListener("abort", item.onAbort);
      activeRequests++;
      resolve();
    };
    item.reject = (err: Error) => {
      clearTimeout(item.timer);
      if (item.onAbort) signal?.removeEventListener("abort", item.onAbort);
      reject(err);
    };

    // ⭐ 客户端断开 → 立刻从队列移除, 释放 slot 位置
    if (signal) {
      item.onAbort = () => item.reject(new Error("CLIENT_ABORTED"));
      if (signal.aborted) {
        clearTimeout(item.timer);
        reject(new Error("CLIENT_ABORTED"));
        return;
      }
      signal.addEventListener("abort", item.onAbort, { once: true });
    }

    concurrencyQueue.push(item);
  });
}

function removeFromQueue(item: QueueItem) {
  const idx = concurrencyQueue.indexOf(item);
  if (idx >= 0) concurrencyQueue.splice(idx, 1);
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
  feedbackLength?: "standard" | "1.5x" | "2x" | "3x";
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

  // 3. ⭐ 廉价预检 (acquire slot 之前做, 避免攻击者用大 body 占槽)
  const clRaw = req.headers.get("content-length");
  const cl = Number(clRaw);
  if (Number.isFinite(cl) && cl > MAX_BODY_BYTES) {
    return jsonError(413, `请求体超过 ${MAX_BODY_BYTES / 1024 / 1024} MB 上限`, correlationId);
  }
  const ctype = req.headers.get("content-type") ?? "";
  if (!ctype.toLowerCase().includes("application/json")) {
    return jsonError(415, "Content-Type 必须是 application/json", correlationId);
  }

  // 4. ⭐ 全局并发限流 (带 abort signal, 客户端断开 → 立刻从队列移除)
  let acquired = false;
  try {
    await acquireConcurrencySlot(req.signal);
    acquired = true;
  } catch (err) {
    if (err instanceof Error && err.message === "CLIENT_ABORTED") {
      // 客户端断开, 静默 499 (nginx 风格)
      return new Response(null, { status: 499 });
    }
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
    if (err instanceof Error && err.message === "CONCURRENCY_QUEUE_FULL") {
      return jsonError(
        503,
        `服务器排队已满 (${CONCURRENCY_QUEUE_MAX}), 请稍后重试`,
        correlationId,
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
  // 4. 参数校验 (Content-Length + Content-Type 已在 POST 主路由预检)

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
    // ⭐ 2026-06-22：把 AI 错误转成友好提示（不再 "AI provider call failed"）
    // 注意：vision 失败时已扣费，需要退款（先记 TODO，后续 P1 实现自动退款）
    console.error(`[${correlationId}] 视觉识别失败:`, err);
    const errorInfo = classifyAIError(err, correlationId);
    return new Response(
      JSON.stringify({
        error: errorInfo.message,
        code: errorInfo.code,
        correlationId,
        refunded: false, // TODO: 实现自动退款
      }),
      {
        status: errorInfo.code === "AI_INSUFFICIENT_BALANCE" ? 402 : 500,
        headers: { "Content-Type": "application/json" },
      },
    );
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
          // ⭐ 2026-06-22：流式错误 → 转 SSE error 事件，让前端显示友好提示
          // 之前直接 controller.error(err) → 客户端 reader.read() 抛原生 NetworkError
          // 用户看到 "network error" 不知道是 AI provider 余额不足
          console.error(`[${correlationId}] 文本生成流错误:`, err);

          const errorInfo = classifyAIError(err, correlationId);
          const errorPayload = `__ERROR__${JSON.stringify({
            code: errorInfo.code,
            message: errorInfo.message,
            correlationId,
          })}\n\n`;
          try {
            controller.enqueue(encoder.encode(errorPayload));
            controller.close();
          } catch {
            // controller 已关闭，忽略
          }
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

// ============================================
// ⭐ AI 错误分类（2026-06-22）
// 把 OpenAI SDK 抛出的各种 error 转成前端友好的 code + message
// 避免用户看到模糊的 "network error"
// ============================================
type AIErrorInfo = {
  code: string;
  message: string;
};

function classifyAIError(err: unknown, correlationId: string): AIErrorInfo {
  const errAny = err as {
    status?: number;
    code?: string;
    error?: { code?: string; type?: string; message?: string };
    message?: string;
  };

  const status = errAny?.status;
  const apiCode = errAny?.error?.code || errAny?.code;
  const apiMessage = errAny?.error?.message || errAny?.message;

  // 1. AI provider 余额不足（DeepSeek 402 / OpenAI 402）
  if (
    status === 402 ||
    apiMessage?.includes("Insufficient Balance") ||
    apiMessage?.includes("insufficient_quota")
  ) {
    return {
      code: "AI_INSUFFICIENT_BALANCE",
      message: "AI 服务余额暂时不足，请稍后再试或联系管理员充值",
    };
  }

  // 2. 限流（429）
  if (status === 429 || apiCode === "rate_limit_exceeded") {
    return {
      code: "AI_RATE_LIMITED",
      message: "AI 服务请求过于频繁，请稍后再试",
    };
  }

  // 3. 用户 T-Coin 不足（如果上游传了相关信息）
  if (apiMessage?.includes("T-Coin") || apiMessage?.includes("余额不足")) {
    return {
      code: "USER_INSUFFICIENT_BALANCE",
      message: "T-Coin 余额不足，请充值后再试",
    };
  }

  // 4. 超时
  if (
    apiCode === "timeout" ||
    apiMessage?.toLowerCase().includes("timeout") ||
    apiMessage?.toLowerCase().includes("timed out")
  ) {
    return {
      code: "AI_TIMEOUT",
      message: "AI 生成超时，请重试（correlatedId 可联系管理员排查）",
    };
  }

  // 5. 上下文超长
  if (
    apiCode === "context_length_exceeded" ||
    apiMessage?.includes("maximum context length")
  ) {
    return {
      code: "AI_CONTEXT_TOO_LONG",
      message: "输入内容过长，请减少图片数量或拆分任务",
    };
  }

  // 6. 默认
  console.error(`[${correlationId}] 未分类的 AI 错误:`, {
    status,
    apiCode,
    apiMessage,
  });
  return {
    code: "AI_GENERATION_FAILED",
    message: `AI 生成失败（${apiMessage?.slice(0, 100) || "未知原因"}，correlatedId 可联系管理员排查）`,
  };
}