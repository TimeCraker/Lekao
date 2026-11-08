import { unstable_cache } from "next/cache";

// ============================================
// T44 · admin 聚合查询缓存 wrapper
// ============================================
// 为什么用 unstable_cache：
//   1. 管理后台查询可能很重（5+ 张表 groupBy + 30 天数据）
//   2. 管理员不要求秒级实时，5min TTL 完全够
//   3. 防管理后台查询拖生产（PRD §6.3 性能指标）
// 4. Next 15+ 内置，与 SSR / RSC 配合好

export function adminCache<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  keyParts: string[],
  revalidateSec: number = 300,
): T {
  return unstable_cache(
    fn as (...args: unknown[]) => Promise<unknown>,
    keyParts,
    {
      revalidate: revalidateSec,
      tags: ["admin-analytics"],
    },
  ) as unknown as T;
}
