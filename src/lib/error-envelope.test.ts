import { describe, expect, it } from "vitest";
import { errorEnvelope, errorResponse, type ErrorCode } from "./error-envelope";

/**
 * S01 AC-012 · 错误契约单测
 *
 * 核心失败响应必须包含稳定 code、correlationId、可执行 recoveryAction、billingState。
 */

const ALL_CODES: ErrorCode[] = [
  "UNAUTHENTICATED",
  "INVALID_REQUEST",
  "MISSING_IDEMPOTENCY_KEY",
  "INSUFFICIENT_BALANCE",
  "CHARGE_RELEASED",
  "CHARGE_ALREADY_SETTLED",
  "RATE_LIMITED",
  "CONCURRENCY_QUEUE_TIMEOUT",
  "AI_PROVIDER_ERROR",
  "AI_TIMEOUT",
  "AI_RATE_LIMITED",
  "AI_CONTEXT_LENGTH",
  "OUTPUT_EMPTY",
  "STREAM_ERROR",
  "NOT_FOUND",
  "INTERNAL",
];

describe("error envelope (AC-012)", () => {
  it("固定包含 error/code/correlationId/recoveryAction/billingState 五个字段", () => {
    const env = errorEnvelope({
      message: "AI 超时",
      code: "AI_TIMEOUT",
      correlationId: "cid-1",
      billingState: "released",
    });
    expect(Object.keys(env).sort()).toEqual([
      "billingState",
      "code",
      "correlationId",
      "error",
      "recoveryAction",
    ]);
    expect(env).toMatchObject({
      error: "AI 超时",
      code: "AI_TIMEOUT",
      correlationId: "cid-1",
      billingState: "released",
    });
    expect(env.recoveryAction.kind).toBe("retry");
  });

  it("每个 code 都有非空恢复动作；默认 billingState=none", () => {
    for (const code of ALL_CODES) {
      const env = errorEnvelope({ message: "x", code, correlationId: "c" });
      expect(env.billingState, `${code} 默认 billingState 应为 none`).toBe(
        "none",
      );
      expect(
        env.recoveryAction.label.length,
        `${code} 必须给出可执行动作`,
      ).toBeGreaterThan(0);
    }
  });

  it("余额不足不得引导用户自助充值（当前未开放）", () => {
    const env = errorEnvelope({
      message: "T-Coin 不足",
      code: "INSUFFICIENT_BALANCE",
      correlationId: "c",
    });
    expect(env.recoveryAction.kind).toBe("contact_admin");
    expect(env.recoveryAction.label).not.toMatch(/充值|购买|支付|付款/);
  });

  it("errorResponse 返回带状态码的 JSON 错误体", async () => {
    const res = errorResponse(402, {
      message: "T-Coin 不足",
      code: "INSUFFICIENT_BALANCE",
      correlationId: "c-2",
      billingState: "none",
    });
    expect(res.status).toBe(402);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    const body = (await res.json()) as {
      code: string;
      correlationId: string;
      billingState: string;
      recoveryAction: { kind: string; label: string };
    };
    expect(body.code).toBe("INSUFFICIENT_BALANCE");
    expect(body.correlationId).toBe("c-2");
    expect(body.billingState).toBe("none");
    expect(typeof body.recoveryAction.label).toBe("string");
  });
});
