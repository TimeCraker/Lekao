/**
 * S01 T-002 · 请求幂等键
 *
 * 每次「逻辑请求」生成一个键，同一次提交的重试必须复用同一个键；
 * 用户主动重新发起生成属于新的逻辑请求，应取新键（上次已 release）。
 * 服务端以 (userId, idempotencyKey) 为唯一约束，重复键不会二次扣币。
 */
export function newIdempotencyKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // 非安全上下文回退（本地 http 调试用；生产为 https，走 randomUUID）
  return `lekao-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
