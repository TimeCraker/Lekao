// ============================================
// Lekao · 课堂小结/反馈 API 路由
// ============================================
// 用户 2026-06-20 决策：
// - 视觉（读图）→ 硅基流动 Qwen3-VL-8B-Instruct
// - 文本（生成）→ DeepSeek V4 Flash 官方
//
// 流程：上传图 → 视觉识别 → 文本生成 → 流式返回
//
// ⭐ 安全加固（2026-06-20 commit review · 4 项）：
// - HIGH: 请求体大小限制 + per-image size cap（防成本放大攻击）
// - MEDIUM: 错误信息脱敏（generic message + correlation id）
// - MEDIUM: per-user rate limit（in-memory LRU 5 calls/min）
// - MEDIUM: 视觉输出校验（在 vision.ts sanitizeVisionResult）

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "node:crypto";
import { authOptions } from "@/lib/auth";
import { recognizeHandout } from "@/lib/ai/vision";
import { generateStream } from "@/lib/ai/text";

export const runtime = "nodejs";
export const maxDuration = 60;

// ============================================
// ⭐ 安全常量
// ============================================
const MAX_BODY_BYTES = 25 * 1024 * 1024; // 25 MB 总请求体上限
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB 每张图 base64 解码后上限
const MAX_IMAGES_COUNT = 10;
const RATE_LIMIT_PER_USER = 5; // 每用户 5 次
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 分钟窗口

// ============================================
// ⭐ Rate Limit（in-memory LRU · 阶段 4 接扣费后改为 Redis）
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

/** 估算 base64 字符串解码后的字节数 */
function estimateBase64Bytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(",");
  const data = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  // base64 解码后 ≈ 长度 * 3/4（去掉 padding 误差）
  return Math.floor((data.length * 3) / 4);
}

type RequestBody = {
  images: string[];
  template: "summary" | "feedback";
};

export async function POST(req: NextRequest) {
  const correlationId = `lekao-${randomUUID()}`;

  // 1. Auth 检查
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response(
      JSON.stringify({ error: "未登录，请先登录后再生成小结/反馈", correlationId }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const userEmail = session.user.email;

  // 2. ⭐ Rate Limit
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

  // 3. ⭐ 请求体大小限制（HIGH fix）
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

  if (
    !body.images ||
    !Array.isArray(body.images) ||
    body.images.length === 0
  ) {
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

  // 5. ⭐ Per-image size cap（HIGH fix）
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

  // 6. 视觉识别（同步调用）
  let visionResult;
  try {
    visionResult = await recognizeHandout(body.images);
  } catch (err) {
    // ⭐ 错误脱敏（MEDIUM fix）：generic message + correlation id
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
    });

    const encoder = new TextEncoder();
    const wrappedStream = new ReadableStream({
      async start(controller) {
        // 先发 metadata 块（让前端先拿到学科/章节/知识点）
        const meta = `__META__${JSON.stringify({
          subject: visionResult.subject,
          topic: visionResult.topic,
          keyPoints: visionResult.keyPoints,
          rawText: visionResult.rawText,
        })}\n\n`;
        controller.enqueue(encoder.encode(meta));

        // 流式转发文本
        const reader = stream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
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
    // ⭐ 错误脱敏
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