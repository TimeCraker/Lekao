// ============================================
// Lekao · 客户端错误上报端点 (2026-07-08 新增)
// ============================================
// 目的: 收集浏览器端 console.error 级错误, 不再"静默失败".
// 背景: docx-generator.ts 历史上图引用断裂只用 console.warn + 静默跳过,
//   老师只看到 docx 缺图, 2 周后才被发现. 升级为 console.error + 上报本端点,
//   服务端日志立即可见, 可接后续 grep/告警.
//
// 设计:
// - 不鉴权 (fire-and-forget, 失败也不影响客户端主流程)
// - 不入库 (v2.0.0+ 功能冻结期, 仅服务端 console.error 日志)
// - body 限制 4KB (防滥用)
// - 解析失败返回 200 (避免污染客户端, 真正的错误源已在客户端 console)

import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4 * 1024;

type ClientErrorBody = {
  source?: string;
  kind?: string;
  message?: string;
  imageId?: string;
  slot?: { qType?: string; qNumber?: string };
  url?: string;
  userAgent?: string;
  stack?: string;
  extra?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  const correlationId = `client-error-${randomUUID()}`;

  // 1. 大小预检
  const clRaw = req.headers.get("content-length");
  const cl = Number(clRaw);
  if (Number.isFinite(cl) && cl > MAX_BODY_BYTES) {
    return Response.json(
      { ok: false, reason: "too-large", correlationId },
      { status: 413 },
    );
  }

  // 2. 解析 (失败也返回 200, 不污染客户端)
  let body: ClientErrorBody = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as ClientErrorBody;
  } catch {
    return Response.json({ ok: false, reason: "bad-json", correlationId });
  }

  // 3. 关键字段 sanity
  if (!body || typeof body !== "object") {
    return Response.json({ ok: false, reason: "bad-body", correlationId });
  }
  const source = (body.source ?? "unknown").slice(0, 64);
  const kind = (body.kind ?? "unknown").slice(0, 64);
  const message = (body.message ?? "").slice(0, 1024);
  const imageId = body.imageId ? String(body.imageId).slice(0, 256) : undefined;
  const slotQType = body.slot?.qType
    ? String(body.slot.qType).slice(0, 32)
    : undefined;
  const slotQNumber = body.slot?.qNumber
    ? String(body.slot.qNumber).slice(0, 32)
    : undefined;

  // 4. 服务端日志 (单行 JSON 便于 grep/journalctl 过滤)
  // 注意: 仅记录非敏感字段, 避免泄漏用户输入
  console.error(
    JSON.stringify({
      level: "client-error",
      correlationId,
      source,
      kind,
      message,
      imageId,
      slot:
        slotQType && slotQNumber
          ? { qType: slotQType, qNumber: slotQNumber }
          : undefined,
      url: body.url ? String(body.url).slice(0, 512) : undefined,
      userAgent: body.userAgent
        ? String(body.userAgent).slice(0, 256)
        : undefined,
      ts: new Date().toISOString(),
    }),
  );

  return Response.json({ ok: true, correlationId });
}
