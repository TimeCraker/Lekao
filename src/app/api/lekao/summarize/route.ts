// ============================================
// Lekao · 课堂小结/反馈 API 路由
// ============================================
// 用户 2026-06-20 决策：
// - 视觉（读图）→ 硅基流动 Qwen3-VL-8B-Instruct
// - 文本（生成）→ DeepSeek V4 Flash 官方
//
// 流程：上传图 → 视觉识别 → 文本生成 → 流式返回
//
// 阶段 1：只做 AI 接入 + auth 检查（不放扣费/落盘，留给阶段 4）

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recognizeHandout } from "@/lib/ai/vision";
import { generateStream } from "@/lib/ai/text";

export const runtime = "nodejs"; // 需要 Node.js fs / Buffer
export const maxDuration = 60; // 最长 60s（视觉 + 文本两次调用）

type RequestBody = {
  images: string[]; // data URL 数组 (data:image/png;base64,...)
  template: "summary" | "feedback"; // "课堂小结" | "家长反馈"
};

export async function POST(req: NextRequest) {
  // 1. Auth 检查
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response(
      JSON.stringify({ error: "未登录，请先登录后再生成小结/反馈" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  // 2. 参数校验
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "请求体不是合法 JSON" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!body.images || !Array.isArray(body.images) || body.images.length === 0) {
    return new Response(JSON.stringify({ error: "至少上传 1 张讲义图片" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (body.images.length > 10) {
    return new Response(JSON.stringify({ error: "最多 10 张图片" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!["summary", "feedback"].includes(body.template)) {
    return new Response(
      JSON.stringify({ error: "template 必须是 summary 或 feedback" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // 3. 视觉识别（同步调用）
  let visionResult;
  try {
    visionResult = await recognizeHandout(body.images);
  } catch (err) {
    console.error("[lekao/summarize] 视觉识别失败:", err);
    return new Response(
      JSON.stringify({
        error:
          err instanceof Error
            ? `视觉识别失败: ${err.message}`
            : "视觉识别失败",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // 4. 文本生成（流式）
  try {
    const stream = generateStream({
      subject: visionResult.subject,
      topic: visionResult.topic,
      keyPoints: visionResult.keyPoints,
      template: body.template,
    });

    // 返回 SSE 流 + 头部 metadata（让前端先拿到学科/章节/知识点）
    const encoder = new TextEncoder();
    const wrappedStream = new ReadableStream({
      async start(controller) {
        // 先发 metadata 块
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
          console.error("[lekao/summarize] 文本生成流错误:", err);
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
    console.error("[lekao/summarize] 文本生成失败:", err);
    return new Response(
      JSON.stringify({
        error:
          err instanceof Error
            ? `文本生成失败: ${err.message}`
            : "文本生成失败",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}