// ============================================
// Lekao · 周末错题反馈表 · 批量 AI 反馈 API（Stage 3）
// ============================================
// 流程：
// 1. Auth
// 2. 请求体校验
// 3. 扣费（1 币/Sheet）
// 4. 视觉识别（Qwen3-VL-8B）+ 批量文本生成（DeepSeek V4 Flash）
// 5. 返回 JSON { students, summary, subject, topic, keyPoints }
//
// ⭐ 非流式：一次性返回所有学生的反馈
// ⭐ 1 币/Sheet（不是 1 币/生）
// ⭐ 限制 ≤ 40 学生/批（超量自动拆批）

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "node:crypto";
import { authOptions } from "@/lib/auth";
import { generateBatchFeedbacks, DEFAULT_SUMMARY_LENGTH, type SummaryLength } from "@/lib/ai/batch-feedback";
import { deductCoin } from "@/lib/coin";

export const runtime = "nodejs";
export const maxDuration = 120;

// ============================================
// 安全常量
// ============================================
const MAX_BODY_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGES_PER_REQUEST = 5;
const MAX_STUDENTS_PER_REQUEST = 60;

// ⭐ Stage 18：作业总体小结字数挡位（5 挡 · 1x 默认 = 至少 2 倍旧 0.5x 基准）
const VALID_SUMMARY_LENGTHS: readonly SummaryLength[] = ["0.5x", "1x", "1.5x", "2x", "3x"];

// ============================================
// 主路由
// ============================================

type RequestBody = {
  lectureImages?: string[];
  lectureImage?: string;
  sheetName: string;
  date: string;
  students: { name: string; qNumbersInput: string }[];
  summaryLength?: string;
};

export async function POST(req: NextRequest) {
  const correlationId = `lekao-batch-${randomUUID()}`;

  // 1. Auth
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session.user.id) {
    return jsonError(401, "未登录，请先登录", correlationId);
  }
  const userId = session.user.id;

  // 2. 预检
  const clRaw = req.headers.get("content-length");
  const cl = Number(clRaw);
  if (Number.isFinite(cl) && cl > MAX_BODY_BYTES) {
    return jsonError(413, `请求体超过 ${MAX_BODY_BYTES / 1024 / 1024} MB 上限`, correlationId);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "请求体不是合法 JSON", correlationId);
  }

  // 3. 参数校验
  // ⭐ Stage 3.4：支持 lectureImages 数组（1-5 张），兼容旧 lectureImage 单数字段
  const lectureImages = normalizeLectureImages(body);
  if (lectureImages.length === 0) {
    return jsonError(400, "缺少讲义图片（lectureImages 数组或 lectureImage 单数）", correlationId);
  }
  if (lectureImages.length > MAX_IMAGES_PER_REQUEST) {
    return jsonError(400, `最多 ${MAX_IMAGES_PER_REQUEST} 张讲义图`, correlationId);
  }
  for (let i = 0; i < lectureImages.length; i++) {
    const img = lectureImages[i];
    if (!img.startsWith("data:image/")) {
      return jsonError(400, `第 ${i + 1} 张讲义图必须是 data:image/ 开头的 data URL`, correlationId);
    }
    const imgBytes = estimateBase64Bytes(img);
    if (imgBytes > MAX_IMAGE_BYTES) {
      return jsonError(413, `第 ${i + 1} 张讲义图超过 ${MAX_IMAGE_BYTES / 1024 / 1024} MB`, correlationId);
    }
  }

  if (!body.sheetName || typeof body.sheetName !== "string") {
    return jsonError(400, "缺少 sheetName", correlationId);
  }
  if (!body.date || typeof body.date !== "string") {
    return jsonError(400, "缺少 date", correlationId);
  }

  if (!Array.isArray(body.students)) {
    return jsonError(400, "students 必须是数组", correlationId);
  }
  if (body.students.length === 0) {
    return jsonError(400, "至少需要 1 个学生", correlationId);
  }
  if (body.students.length > MAX_STUDENTS_PER_REQUEST) {
    return jsonError(400, `每次最多 ${MAX_STUDENTS_PER_REQUEST} 个学生`, correlationId);
  }
  for (let i = 0; i < body.students.length; i++) {
    const s = body.students[i];
    if (!s.name || typeof s.name !== "string") {
      return jsonError(400, `第 ${i + 1} 个学生缺少 name`, correlationId);
    }
    if (typeof s.qNumbersInput !== "string") {
      return jsonError(400, `第 ${i + 1} 个学生 qNumbersInput 必须是字符串`, correlationId);
    }
  }

  // ⭐ Stage 18：summaryLength 字数挡位校验（默认 1x = 至少 2 倍旧基准）
  let summaryLength: SummaryLength = DEFAULT_SUMMARY_LENGTH;
  if (body.summaryLength !== undefined) {
    if (
      typeof body.summaryLength !== "string" ||
      !VALID_SUMMARY_LENGTHS.includes(body.summaryLength as SummaryLength)
    ) {
      return jsonError(
        400,
        `summaryLength 必须是 ${VALID_SUMMARY_LENGTHS.join(" / ")} 之一`,
        correlationId,
      );
    }
    summaryLength = body.summaryLength as SummaryLength;
  }

  // 4. 扣费（1 币/Sheet）
  const deductResult = await deductCoin(userId);
  if (!deductResult.success) {
    if (deductResult.reason === "insufficient") {
      return jsonError(402, "T-Coin 余额不足，请充值后再试", correlationId);
    }
    return jsonError(404, "用户不存在", correlationId);
  }

  // 5. AI 生成
  try {
    const result = await generateBatchFeedbacks(
      lectureImages,
      body.students,
      body.sheetName,
      body.date,
      summaryLength,
    );

    return Response.json({
      success: true,
      correlationId,
      coinUsed: 1,
      coinSource: deductResult.source,
      newGift: deductResult.newGift,
      newPaid: deductResult.newPaid,
      ...result,
    });
  } catch (err) {
    console.error(`[${correlationId}] 批量反馈生成失败:`, err);
    const errorInfo = classifyAIError(err, correlationId);
    return Response.json(
      {
        success: false,
        error: errorInfo.message,
        code: errorInfo.code,
        correlationId,
      },
      { status: errorInfo.code === "AI_INSUFFICIENT_BALANCE" ? 402 : 500 },
    );
  }
}

// ============================================
// 帮助函数
// ============================================

function jsonError(status: number, error: string, correlationId: string): Response {
  return Response.json({ error, correlationId }, { status });
}

function estimateBase64Bytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(",");
  const data = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  return Math.floor((data.length * 3) / 4);
}

/**
 * ⭐ Stage 3.4：兼容 lectureImages 数组 + lectureImage 单数字段
 * 优先用 lectureImages，没有就用 lectureImage 包成数组
 */
function normalizeLectureImages(body: RequestBody): string[] {
  if (Array.isArray(body.lectureImages) && body.lectureImages.length > 0) {
    return body.lectureImages.filter((s): s is string => typeof s === "string");
  }
  if (typeof body.lectureImage === "string" && body.lectureImage.length > 0) {
    return [body.lectureImage];
  }
  return [];
}

function classifyAIError(err: unknown, _correlationId: string): { code: string; message: string } {
  const errAny = err as {
    status?: number;
    code?: string;
    error?: { code?: string; type?: string; message?: string };
    message?: string;
  };

  const status = errAny?.status;
  const apiMessage = errAny?.error?.message || errAny?.message;

  if (status === 402 || apiMessage?.includes("Insufficient Balance") || apiMessage?.includes("insufficient_quota")) {
    return { code: "AI_INSUFFICIENT_BALANCE", message: "AI 服务余额暂时不足，请稍后再试" };
  }
  if (status === 429) {
    return { code: "AI_RATE_LIMITED", message: "AI 服务请求过于频繁，请稍后再试" };
  }
  if (apiMessage?.toLowerCase().includes("timeout") || apiMessage?.toLowerCase().includes("timed out")) {
    return { code: "AI_TIMEOUT", message: "AI 生成超时，请重试" };
  }
  // console.error 已在上层记录完整错误，不把上游原始消息泄漏到客户端
  return { code: "AI_GENERATION_FAILED", message: "AI 生成失败，请稍后重试" };
}
