// ============================================
// Lekao · T-Coin 扣费封装
// ============================================
// 按 PRD §5.2.2 + BRD §5.2 既定结论：
// - 扣费优先级：先扣 lekao_gift_coin（赠送）→ 再扣 t_coin（充值）
// - 资产池软隔离：lekao_gift_coin 仅 Lekao 用，t_coin 跨产品共享
// - 注册赠送 5 枚（lekao_gift_coin 默认 -1，signIn callback 延迟初始化）
//
// ⭐ 原子性（阶段 4 hotfix）：用 updateMany + where 条件 = atomic single-statement
//   UPDATE WHERE lekao_gift_coin > 0 SET lekao_gift_coin = lekao_gift_coin - 1
//   PG 不会让两个并发 decrement 都成功到负数（旧版 read-then-write 有 race）
// ⭐ 错误分类：user_not_found / insufficient / unknown

import { prisma } from "./prisma";

export type DeductResult =
  | {
      success: true;
      source: "gift" | "paid";
      newGift: number;
      newPaid: number;
    }
  | {
      success: false;
      reason: "insufficient" | "user_not_found";
    };

/**
 * 扣 1 枚 T-Coin（原子条件 update，规避并发双扣）
 *
 * @param userId - 用户 ID（next-auth session.user.id）
 * @returns DeductResult
 */
export async function deductCoin(userId: string): Promise<DeductResult> {
  return prisma.$transaction(async (tx) => {
    // 1. 验存在（user 不存在时 updateMany 返回 count=0，会误判为 insufficient）
    const exists = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!exists) {
      return { success: false, reason: "user_not_found" } as const;
    }

    // 2. 优先扣赠送额度（atomic conditional decrement）
    const giftHit = await tx.user.updateMany({
      where: { id: userId, lekao_gift_coin: { gt: 0 } },
      data: { lekao_gift_coin: { decrement: 1 } },
    });
    if (giftHit.count > 0) {
      const updated = await tx.user.findUnique({
        where: { id: userId },
        select: { lekao_gift_coin: true, t_coin: true },
      });
      return {
        success: true,
        source: "gift",
        newGift: updated!.lekao_gift_coin,
        newPaid: updated!.t_coin,
      } as const;
    }

    // 3. 否则扣充值额度（atomic conditional decrement）
    const paidHit = await tx.user.updateMany({
      where: { id: userId, t_coin: { gt: 0 } },
      data: { t_coin: { decrement: 1 } },
    });
    if (paidHit.count > 0) {
      const updated = await tx.user.findUnique({
        where: { id: userId },
        select: { lekao_gift_coin: true, t_coin: true },
      });
      return {
        success: true,
        source: "paid",
        newGift: updated!.lekao_gift_coin,
        newPaid: updated!.t_coin,
      } as const;
    }

    // 4. 都为 0 → 余额不足
    return { success: false, reason: "insufficient" } as const;
  });
}

/**
 * 查询用户 T-Coin 总余额（赠送 + 充值）
 *
 * 注意：lekao_gift_coin = -1 表示未初始化（首次登录会变 5）
 */
export async function getCoinBalance(
  userId: string,
): Promise<{ gift: number; paid: number; total: number; initialized: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lekao_gift_coin: true, t_coin: true },
  });

  if (!user) {
    return { gift: 0, paid: 0, total: 0, initialized: false };
  }

  const initialized = user.lekao_gift_coin !== -1;
  const gift = initialized ? Math.max(0, user.lekao_gift_coin) : 0;

  return {
    gift,
    paid: user.t_coin,
    total: gift + user.t_coin,
    initialized,
  };
}