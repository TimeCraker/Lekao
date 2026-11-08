import { describe, expect, it } from "vitest";
import * as coin from "@/lib/coin";

/**
 * S01 AC-001 · 计费状态机**出口契约**（T-002 已实施 → 本文件已转绿）
 *
 * 行为级覆盖（幂等重放、非法迁移、按原池返还）在 `src/lib/coin-ledger.test.ts`。
 * 这里只锁住路由依赖的入口契约：收费路由必须能从 `@/lib/coin` 拿到三态 API，
 * 且不再暴露无账本的 deductCoin / refundCoin 旧入口。
 * 若将来有人把状态机从计费入口摘掉，本文件会失败。
 */
describe("S01 AC-001 计费状态机出口契约", () => {
  it("计费入口暴露 reserve / settle / release 三态 API", () => {
    expect(typeof coin.reserveCoin).toBe("function");
    expect(typeof coin.settleCoin).toBe("function");
    expect(typeof coin.releaseCoin).toBe("function");
  });

  it("不再提供无账本的 deductCoin / refundCoin 旧入口", () => {
    // 旧入口是「先扣后多路退款」，无幂等键、无账本，重试语义未定义
    expect(coin).not.toHaveProperty("deductCoin");
    expect(coin).not.toHaveProperty("refundCoin");
  });
});
