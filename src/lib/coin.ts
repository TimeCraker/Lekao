// ============================================
// Lekao · T-Coin 计费入口
// ============================================
// 资产池语义（不变）：
// - 扣费优先级：先扣 lekao_gift_coin（赠送）→ 再扣 t_coin（充值）
// - 资产池软隔离：lekao_gift_coin 仅 Lekao 用，t_coin 跨产品共享
// - 注册赠送 5 枚（lekao_gift_coin 默认 -1，signIn callback 延迟初始化）
//
// ⭐ S01 T-002：扣费收敛为幂等状态机 reserve → settle | released
//   账本表 lekao_generation_charges（(userId, idempotencyKey) 唯一），
//   实现见 ./coin-ledger.ts。旧的 deductCoin / refundCoin（先扣后多路退款的
//   两套模式 + 无账本）已删除，收费路由统一走状态机。

import { prisma } from "./prisma";

export {
  releaseCoin,
  reserveCoin,
  settleCoin,
  type BillingBalance,
  type ChargeOperation,
  type ChargeSource,
  type ChargeState,
  type ReleaseResult,
  type ReserveResult,
  type SettleResult,
} from "./coin-ledger";

/**
 * 查询用户 T-Coin 总余额（赠送 + 充值）
 *
 * 注意：lekao_gift_coin = -1 表示未初始化（首次登录会变 5）
 */
export async function getCoinBalance(userId: string): Promise<{
  gift: number;
  paid: number;
  total: number;
  initialized: boolean;
}> {
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
