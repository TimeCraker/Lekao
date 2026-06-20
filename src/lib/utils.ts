// ============================================
// Lekao · 通用工具函数
// ============================================

/**
 * 合并 className（替代 clsx 依赖）
 *
 * 逻辑：
 * - 字符串 → 原样拼接（去重）
 * - false / null / undefined → 跳过
 * - 对象 → 取 value 为 truthy 的 key
 */
export function cn(
  ...inputs: Array<string | false | null | undefined | Record<string, unknown>>
): string {
  const parts: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === "string") {
      parts.push(input);
    } else if (typeof input === "object") {
      for (const [key, value] of Object.entries(input)) {
        if (value) parts.push(key);
      }
    }
  }
  return parts.join(" ");
}

/**
 * 文件大小格式化
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}