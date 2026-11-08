/**
 * 阶段3 诊断 · AI provider 配置单一入口（环境变量驱动，默认值＝现网配置）
 *
 * 目的：把「换 provider / 换模型」变成改 .env 而不是改代码，
 * 同时保证不设任何环境变量时行为与改动前**完全一致**。
 *
 * 环境变量（都可选）：
 * - VISION_API_KEY / VISION_BASE_URL / VISION_MODEL   （默认 硅基流动 + Qwen3-VL-8B-Instruct）
 * - TEXT_API_KEY   / TEXT_BASE_URL   / TEXT_MODEL     （默认 DeepSeek 官方 + deepseek-v4-flash）
 * - 兼容旧变量：未设 VISION_API_KEY 时回退 SILICONFLOW_API_KEY；未设 TEXT_API_KEY 时回退 DEEPSEEK_API_KEY
 */

export interface ProviderConfig {
  apiKey: string | undefined;
  baseURL: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
  /** 缺 key 时报错要提到的变量名（便于使用者知道该填哪个） */
  keyHint: string;
}

export const VISION_TIMEOUT_MS = 90_000;
export const TEXT_TIMEOUT_MS = 120_000;
/** SDK 层重试上限（阶段3 诊断 S2：默认 2 次会成倍放大最坏等待） */
export const AI_MAX_RETRIES = 1;

export function resolveVisionProvider(): ProviderConfig {
  return {
    apiKey: process.env.VISION_API_KEY ?? process.env.SILICONFLOW_API_KEY,
    baseURL: process.env.VISION_BASE_URL ?? "https://api.siliconflow.cn/v1",
    model: process.env.VISION_MODEL ?? "Qwen/Qwen3-VL-8B-Instruct",
    timeoutMs: VISION_TIMEOUT_MS,
    maxRetries: AI_MAX_RETRIES,
    keyHint: "VISION_API_KEY（或旧名 SILICONFLOW_API_KEY）",
  };
}

export function resolveTextProvider(): ProviderConfig {
  return {
    apiKey: process.env.TEXT_API_KEY ?? process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.TEXT_BASE_URL ?? "https://api.deepseek.com/v1",
    model: process.env.TEXT_MODEL ?? "deepseek-v4-flash",
    timeoutMs: TEXT_TIMEOUT_MS,
    maxRetries: AI_MAX_RETRIES,
    keyHint: "TEXT_API_KEY（或旧名 DEEPSEEK_API_KEY）",
  };
}

export function missingKeyError(config: ProviderConfig): Error {
  return new Error(
    `${config.keyHint} 未配置。请在 .env 中添加（密钥不 commit 到 git）。`,
  );
}

/**
 * 附加请求体（provider 无关的逃生口）
 *
 * 用途举例：智谱 GLM 系推理模型做「JSON 抽取」这类短任务时会把时间花在思考上，
 * 可传 `AI_EXTRA_BODY_JSON={"thinking":{"type":"disabled"}}` 关闭思考；
 * 而硅基流动的 Qwen3-VL 不认这个字段，所以**默认不注入**（不设变量时行为不变）。
 * 解析失败只警告、不注入，避免把非法 JSON 透传给 provider。
 */
export function extraBody(): Record<string, unknown> {
  const raw = process.env.AI_EXTRA_BODY_JSON;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    console.warn("[provider-config] AI_EXTRA_BODY_JSON 不是合法 JSON，已忽略");
    return {};
  }
}
