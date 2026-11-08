/**
 * S01 T-002 · 稳定错误契约（AC-012）
 *
 * 所有核心失败响应必须包含：稳定 code、correlationId、可执行 recoveryAction、适用的 billingState。
 * 兼容性约束：
 * - `error` 仍是人类可读消息（老客户端读 data.error）。
 * - SSE 的 `__ERROR__{code,message,correlationId}` 形状只在原字段上**追加**字段，不改变已有字段。
 */

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "INVALID_REQUEST"
  | "MISSING_IDEMPOTENCY_KEY"
  | "INSUFFICIENT_BALANCE"
  | "CHARGE_RELEASED"
  | "CHARGE_ALREADY_SETTLED"
  | "RATE_LIMITED"
  | "CONCURRENCY_QUEUE_TIMEOUT"
  | "AI_PROVIDER_ERROR"
  | "AI_TIMEOUT"
  | "AI_RATE_LIMITED"
  | "AI_CONTEXT_LENGTH"
  | "OUTPUT_EMPTY"
  | "STREAM_ERROR"
  | "NOT_FOUND"
  | "INTERNAL";

/** 请求级账务状态；none = 本次请求没有产生任何预留 */
export type BillingState = "reserved" | "settled" | "released" | "none";

export type RecoveryActionKind =
  "retry" | "reduce_input" | "wait" | "reauth" | "contact_admin" | "none";

export interface RecoveryAction {
  kind: RecoveryActionKind;
  /** 面向用户的短句，必须是当前可执行的动作 */
  label: string;
}

export interface ErrorEnvelope {
  error: string;
  code: ErrorCode;
  correlationId: string;
  recoveryAction: RecoveryAction;
  billingState: BillingState;
}

export interface ErrorEnvelopeInput {
  message: string;
  code: ErrorCode;
  correlationId: string;
  billingState?: BillingState;
  recoveryAction?: RecoveryAction;
}

/** 按 code 给出默认恢复动作；调用方可覆盖（例如余额不足时的真实渠道） */
const DEFAULT_RECOVERY: Record<ErrorCode, RecoveryAction> = {
  UNAUTHENTICATED: { kind: "reauth", label: "重新登录后再试" },
  INVALID_REQUEST: { kind: "none", label: "按提示修正输入后重试" },
  MISSING_IDEMPOTENCY_KEY: { kind: "retry", label: "刷新页面后重新提交" },
  INSUFFICIENT_BALANCE: {
    kind: "contact_admin",
    label: "T-Coin 不足：请联系管理员补充",
  },
  CHARGE_RELEASED: { kind: "retry", label: "本次请求已释放，重新发起一次" },
  CHARGE_ALREADY_SETTLED: { kind: "none", label: "该请求已完成结算，无需重试" },
  RATE_LIMITED: { kind: "wait", label: "请求过于频繁，稍等片刻再试" },
  CONCURRENCY_QUEUE_TIMEOUT: { kind: "retry", label: "稍等片刻后重试" },
  AI_PROVIDER_ERROR: { kind: "retry", label: "稍后重试；本次未扣币" },
  AI_TIMEOUT: { kind: "retry", label: "稍后重试或减少图片数量" },
  AI_RATE_LIMITED: { kind: "wait", label: "等待 1 分钟后重试" },
  AI_CONTEXT_LENGTH: {
    kind: "reduce_input",
    label: "减少讲义图片或截断长文本后重试",
  },
  OUTPUT_EMPTY: { kind: "retry", label: "换一张更清晰的图片后重试" },
  STREAM_ERROR: { kind: "retry", label: "网络中断，本次未扣币，可重新提交" },
  NOT_FOUND: { kind: "none", label: "刷新页面查看最新状态" },
  INTERNAL: { kind: "retry", label: "稍后重试；若持续失败请反馈" },
};

export function errorEnvelope(input: ErrorEnvelopeInput): ErrorEnvelope {
  return {
    error: input.message,
    code: input.code,
    correlationId: input.correlationId,
    recoveryAction: input.recoveryAction ?? DEFAULT_RECOVERY[input.code],
    billingState: input.billingState ?? "none",
  };
}

/** 统一 JSON 错误响应（HTTP 状态码与 envelope 一起返回） */
export function errorResponse(
  status: number,
  input: ErrorEnvelopeInput,
): Response {
  return new Response(JSON.stringify(errorEnvelope(input)), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
