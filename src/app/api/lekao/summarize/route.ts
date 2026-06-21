// ============================================
// Lekao · 课堂小结/反馈 API 路由（阶段 4 · 扣费 + 落盘）
// ============================================
// 流程：
// 1. Auth + Rate Limit（阶段 1）
// 2. 扣费前置（阶段 4 · 先 lekao_gift_coin → 再 t_coin）
// 3. 视觉识别（阶段 1）
// 4. 文本生成流式返回（阶段 1）
// 5. 落盘 lekao_class_summaries / lekao_class_feedbacks（阶段 4）
//
// ⭐ 扣费失败：返回 402 + 友好提示，不调 AI
// ⭐ 落盘失败：仅 console.error，不影响用户（已扣费 + 已交付）

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
// 安全常量（阶段 1.1 加固）
// ============================================
const MAX_BODY_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGES_COUNT = 10;
const RATE_LIMIT_PER_USER = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// ============================================
// Rate Limit
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
};

export async function POST(req: NextRequest) {
  const correlationId = `lekao-${randomUUID()}`;

  // 1. Auth
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session.user.id) {
    return new Response(
      JSON.stringify({ error: "未登录，请先登录后再生成小结/反馈", correlationId }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
  const userId = session.user.id;
  const userEmail = session.user.email;

  // 2. Rate Limit
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

  // 3. 请求体大小限制
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return new Response(
      JSON.stringify({
        error: `请求体超过 ${MAX_BODY_BYTES / 1024 / 1024} MB 上限`,
        correlationId,
      }),
      { status: 413, headers: { "Content-Type": "application/json" } },
    );
  }

  // 4. 参数校验
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "请求体不是合法 JSON", correlationId }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!body.images || !Array.isArray(body.images) || body.images.length === 0) {
    return new Response(
      JSON.stringify({ error: "至少上传 1 张讲义图片", correlationId }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (body.images.length > MAX_IMAGES_COUNT) {
    return new Response(
      JSON.stringify({ error: `最多 ${MAX_IMAGES_COUNT} 张图片`, correlationId }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  for (let i = 0; i < body.images.length; i++) {
    const img = body.images[i];
    if (typeof img !== "string" || !img.startsWith("data:image/")) {
      return new Response(
        JSON.stringify({ error: `第 ${i + 1} 张图不是合法图片`, correlationId }),
        { status: 400, headers: { "Content-Type": "application/json" } },
    );
    }
    const bytes = estimateBase64Bytes(img);
    if (bytes > MAX_IMAGE_BYTES) {
      return new Response(
        JSON.stringify({
          error: `第 ${i + 1} 张图超过 ${MAX_IMAGE_BYTES / 1024 / 1024} MB`,
          correlationId,
        }),
        { status: 413, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  if (!["summary", "feedback"].includes(body.template)) {
    return new Response(
      JSON.stringify({ error: "template 必须是 summary 或 feedback", correlationId }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // 5. ⭐ 扣费前置（PRD §5.2.2 · 阶段 4）
  const deductResult = await deductCoin(userId);
  if (!deductResult.success) {
    if (deductResult.reason === "insufficient") {
      return new Response(
        JSON.stringify({
          error: "T-Coin 余额不足，请充值后再试",
          correlationId,
        }),
        { status: 402, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({
        error: "用户不存在",
        correlationId,
      }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  // 6. 视觉识别
  let visionResult;
  try {
    visionResult = await recognizeHandout(body.images);
  } catch (err) {
    console.error(`[${correlationId}] 视觉识别失败:`, err);
    return new Response(
      JSON.stringify({
        error: "AI provider call failed",
        correlationId,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // 7. 文本生成（流式）
  try {
    const stream = generateStream({
      subject: visionResult.subject,
      topic: visionResult.topic,
      keyPoints: visionResult.keyPoints,
      template: body.template,
      className: body.className,
      date: body.date,
      feedbackCount: body.feedbackCount,
      feedbackLength: body.feedbackLength,
    });

    const encoder = new TextEncoder();
    const wrappedStream = new ReadableStream({
      async start(controller) {
        const meta = `__META__${JSON.stringify({
          subject: visionResult.subject,
          topic: visionResult.topic,
          keyPoints: visionResult.keyPoints,
          rawText: visionResult.rawText,
          // ⭐ 阶段 4：扣费信息让前端刷新余额
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

          // ⭐ 阶段 4：流式结束后落盘（PRD §7.6 防客诉）
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
            // 落盘失败不回滚（用户已得到输出，仅少一条历史记录）
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
    return new Response(
      JSON.stringify({
        error: "AI provider call failed",
        correlationId,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}