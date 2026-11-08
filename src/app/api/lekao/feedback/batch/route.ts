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
import type { Session } from "next-auth";
import { randomUUID } from "node:crypto";
import { authOptions } from "@/lib/auth";
import {
  generateBatchFeedbacks,
  DEFAULT_SUMMARY_LENGTH,
  type SummaryLength,
} from "@/lib/ai/batch-feedback";
import {
  getCoinBalance,
  releaseCoin,
  reserveCoin,
  settleCoin,
} from "@/lib/coin";
import { errorResponse, type ErrorCode } from "@/lib/error-envelope";
import { parseStyle, type TemplateStyle } from "@/lib/templates";
import { prisma } from "@/lib/prisma";

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
const VALID_SUMMARY_LENGTHS: readonly SummaryLength[] = [
  "0.5x",
  "1x",
  "1.5x",
  "2x",
  "3x",
];

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
  /** 模板 id：preset（standard/concise）或自有模板 cuid（2026-08-28 周末场景接入） */
  templateId?: string;
  /** 幂等键（S01 T-002）：优先用 Idempotency-Key header，其次本字段 */
  requestId?: string;
};

export async function POST(req: NextRequest) {
  const correlationId = `lekao-batch-${randomUUID()}`;

  // 1. Auth
  // ⭐ Stage 18.5：getServerSession 在 JWT 解码失败时会抛 Invalid Compact JWE 异常
  // （常发生在 NEXTAUTH_SECRET 变了之后 + 旧 cookie 还没过期），这里兜底成 401 JSON
  // 避免异常逃逸到 Next.js 全局 handler → 500 HTML → 前端 res.json() 炸
  let session: Session | null;
  try {
    session = await getServerSession(authOptions);
  } catch (err) {
    console.error(
      `[${correlationId}] getServerSession 异常（JWT 解码失败？）:`,
      err,
    );
    return jsonError(
      401,
      "登录态已失效，请重新登录后再试（cookie secret 已变更）",
      correlationId,
    );
  }
  if (!session?.user?.email || !session.user.id) {
    return jsonError(401, "未登录，请先登录", correlationId);
  }
  const userId = session.user.id;

  // 2. 预检
  const clRaw = req.headers.get("content-length");
  const cl = Number(clRaw);
  if (Number.isFinite(cl) && cl > MAX_BODY_BYTES) {
    return jsonError(
      413,
      `请求体超过 ${MAX_BODY_BYTES / 1024 / 1024} MB 上限`,
      correlationId,
    );
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
    return jsonError(
      400,
      "缺少讲义图片（lectureImages 数组或 lectureImage 单数）",
      correlationId,
    );
  }
  if (lectureImages.length > MAX_IMAGES_PER_REQUEST) {
    return jsonError(
      400,
      `最多 ${MAX_IMAGES_PER_REQUEST} 张讲义图`,
      correlationId,
    );
  }
  for (let i = 0; i < lectureImages.length; i++) {
    const img = lectureImages[i];
    if (!img.startsWith("data:image/")) {
      return jsonError(
        400,
        `第 ${i + 1} 张讲义图必须是 data:image/ 开头的 data URL`,
        correlationId,
      );
    }
    const imgBytes = estimateBase64Bytes(img);
    if (imgBytes > MAX_IMAGE_BYTES) {
      return jsonError(
        413,
        `第 ${i + 1} 张讲义图超过 ${MAX_IMAGE_BYTES / 1024 / 1024} MB`,
        correlationId,
      );
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
    return jsonError(
      400,
      `每次最多 ${MAX_STUDENTS_PER_REQUEST} 个学生`,
      correlationId,
    );
  }
  for (let i = 0; i < body.students.length; i++) {
    const s = body.students[i];
    if (!s.name || typeof s.name !== "string") {
      return jsonError(400, `第 ${i + 1} 个学生缺少 name`, correlationId);
    }
    if (typeof s.qNumbersInput !== "string") {
      return jsonError(
        400,
        `第 ${i + 1} 个学生 qNumbersInput 必须是字符串`,
        correlationId,
      );
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

  // 4. 余额预检（不扣，避免余额不足还调 AI 浪费 token）
  const balance = await getCoinBalance(userId);
  if (balance.total <= 0) {
    return jsonError(
      402,
      "T-Coin 余额不足：每日签到可领币（连续签到奖励更多），明天再来",
      correlationId,
      "INSUFFICIENT_BALANCE",
    );
  }

  // 4.2 幂等键（S01 T-002）：与 /api/lekao/summarize 同一契约
  const idempotencyKey = resolveIdempotencyKey(req, body, correlationId);
  if (!idempotencyKey) {
    return jsonError(
      400,
      "缺少幂等键：请刷新页面后重新提交（Idempotency-Key header 或 body.requestId）",
      correlationId,
      "MISSING_IDEMPOTENCY_KEY",
    );
  }

  // 4.5 模板解析（2026-08-28 周末场景接入）：templateId → style
  // preset 直映射；自有模板查 DB（归属校验）；无效/越权/查询失败 → 静默回退标准（不 500）
  // 与 /api/lekao/summarize 的解析段行为一致
  let style: TemplateStyle | undefined;
  if (body.templateId === "concise") {
    style = { tone: "concise" };
  } else if (body.templateId && body.templateId !== "standard") {
    try {
      const tpl = await prisma.lekaoTemplate.findUnique({
        where: { id: body.templateId },
        select: { userId: true, content: true },
      });
      if (tpl && tpl.userId === userId) {
        style = parseStyle(tpl.content) ?? undefined;
      }
    } catch (tplErr) {
      console.error(`[${correlationId}] 模板查询失败（回退标准）:`, tplErr);
    }
  }

  // 5. 幂等计费：先 reserve（1 币/Sheet），成功后再 settle —— 替代旧的「生成成功后才扣且扣费失败仍成功」
  const reservation = await reserveCoin({
    userId,
    idempotencyKey,
    operation: "batch-feedback",
    correlationId,
  });
  if (!reservation.ok) {
    if (reservation.reason === "insufficient") {
      return jsonError(
        402,
        "T-Coin 余额不足：每日签到可领币（连续签到奖励更多），明天再来",
        correlationId,
        "INSUFFICIENT_BALANCE",
      );
    }
    if (reservation.reason === "already_settled") {
      return jsonError(
        409,
        "该请求已完成结算，请勿重复提交",
        correlationId,
        "CHARGE_ALREADY_SETTLED",
        "settled",
      );
    }
    if (reservation.reason === "released") {
      return jsonError(
        409,
        "该请求已释放，请重新发起一次生成",
        correlationId,
        "CHARGE_RELEASED",
        "released",
      );
    }
    return jsonError(404, "用户不存在", correlationId, "NOT_FOUND");
  }

  // 6. AI 生成；失败/空响应 → release（内容没交付，按账本原池返还）
  let settled = false;
  try {
    const result = await generateBatchFeedbacks(
      lectureImages,
      body.students,
      body.sheetName,
      body.date,
      summaryLength,
      style,
    );

    const settleResult = await settleCoin({ userId, idempotencyKey });
    settled = settleResult.ok;
    if (!settleResult.ok) {
      console.error(
        `[${correlationId}] 结算失败: ${settleResult.reason} state=${settleResult.currentState ?? "n/a"}`,
      );
    }

    return Response.json({
      success: true,
      correlationId,
      coinUsed: 1,
      coinSource: reservation.source,
      newGift: reservation.balance.gift,
      newPaid: reservation.balance.paid,
      billingState: settled ? "settled" : "reserved",
      chargeId: reservation.chargeId,
      ...result,
    });
  } catch (err) {
    console.error(`[${correlationId}] 批量反馈生成失败:`, err);
    const errorInfo = classifyAIError(err);
    if (!settled) {
      const released = await releaseCoin({
        userId,
        idempotencyKey,
        reason: `批量反馈失败释放-${errorInfo.code}-${correlationId}`,
      });
      return errorResponse(
        errorInfo.code === "AI_INSUFFICIENT_BALANCE" ? 402 : 500,
        {
          message: errorInfo.message,
          code: toErrorCode(errorInfo.code),
          correlationId,
          billingState: released.ok ? "released" : "reserved",
        },
      );
    }
    return errorResponse(
      errorInfo.code === "AI_INSUFFICIENT_BALANCE" ? 402 : 500,
      {
        message: errorInfo.message,
        code: toErrorCode(errorInfo.code),
        correlationId,
        billingState: "settled",
      },
    );
  }
}

// ============================================
// 帮助函数
// ============================================

function jsonError(
  status: number,
  error: string,
  correlationId: string,
  code?: ErrorCode,
  billingState?: "reserved" | "settled" | "released" | "none",
): Response {
  return errorResponse(status, {
    message: error,
    code: code ?? defaultCodeForStatus(status),
    correlationId,
    billingState,
  });
}

/**
 * 幂等键来源：`Idempotency-Key` header 优先，其次 body.requestId。
 * 与 /api/lekao/summarize 一致：默认自动补键。
 * `BILLING_IDEMPOTENCY_COMPAT=0` 改为严格 400。保持默认补键。
 */
function resolveIdempotencyKey(
  req: NextRequest,
  body: RequestBody,
  correlationId: string,
): string | null {
  const raw = req.headers.get("idempotency-key") ?? body.requestId ?? "";
  const key = raw.trim();
  if (key) return key;
  if (process.env.BILLING_IDEMPOTENCY_COMPAT === "0") return null;
  const generated = randomUUID();
  console.warn(`[${correlationId}] 缺少幂等键，兼容期自动补充 ${generated}`);
  return generated;
}

/** AI 错误码 → 稳定错误契约 code（响应里的原始 code 语义保持不变） */
function toErrorCode(raw: string): ErrorCode {
  switch (raw) {
    case "AI_RATE_LIMITED":
      return "AI_RATE_LIMITED";
    case "USER_INSUFFICIENT_BALANCE":
      return "INSUFFICIENT_BALANCE";
    case "AI_TIMEOUT":
      return "AI_TIMEOUT";
    case "AI_CONTEXT_TOO_LONG":
      return "AI_CONTEXT_LENGTH";
    case "AI_EMPTY_OUTPUT":
      return "OUTPUT_EMPTY";
    default:
      return "AI_PROVIDER_ERROR";
  }
}

function defaultCodeForStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
    case 413:
    case 415:
      return "INVALID_REQUEST";
    case 401:
      return "UNAUTHENTICATED";
    case 402:
      return "INSUFFICIENT_BALANCE";
    case 404:
      return "NOT_FOUND";
    case 429:
      return "RATE_LIMITED";
    case 503:
      return "CONCURRENCY_QUEUE_TIMEOUT";
    default:
      return "INTERNAL";
  }
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

function classifyAIError(err: unknown): { code: string; message: string } {
  const errAny = err as {
    status?: number;
    code?: string;
    error?: { code?: string; type?: string; message?: string };
    message?: string;
  };

  const status = errAny?.status;
  const apiMessage = errAny?.error?.message || errAny?.message;

  if (
    status === 402 ||
    apiMessage?.includes("Insufficient Balance") ||
    apiMessage?.includes("insufficient_quota")
  ) {
    return {
      code: "AI_INSUFFICIENT_BALANCE",
      message: "AI 服务余额暂时不足，请稍后再试",
    };
  }
  if (status === 429) {
    return {
      code: "AI_RATE_LIMITED",
      message: "AI 服务请求过于频繁，请稍后再试",
    };
  }
  if (
    apiMessage?.toLowerCase().includes("timeout") ||
    apiMessage?.toLowerCase().includes("timed out")
  ) {
    return { code: "AI_TIMEOUT", message: "AI 生成超时，请重试" };
  }
  // console.error 已在上层记录完整错误，不把上游原始消息泄漏到客户端
  return { code: "AI_GENERATION_FAILED", message: "AI 生成失败，请稍后重试" };
}
