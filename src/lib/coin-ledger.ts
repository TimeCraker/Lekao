/**
 * S01 T-002 · T-Coin 幂等计费状态机
 *
 * 规格 §3.1：request + idempotencyKey → reserve → AI job → settle | release
 *
 * 关键不变量：
 * - `(userId, idempotencyKey)` 唯一：同一逻辑请求重试**不会**产生第二条扣款。
 * - reserve 时记录 source(gift|paid)，release 按**原池**精确返还（不按当前余额猜池子）。
 * - 状态迁移单向：reserved → settled | released；settled 不可 release，released 不可 settle。
 * - 同一 key 重放：
 *   - reserved/settled 的 reserve 重放 → 不再扣币，返回终态（settled 用 already_settled 让调用方明确）
 *   - released 的 reserve 重放 → released（调用方需换新 key 重新发起）
 *   - settle/release 重放 → 幂等成功，replayed=true，不重复改余额
 *
 * 为什么不是「先扣后退」：旧实现 summarize 先生成前扣、失败再多次 refund，
 * batch 则成功后扣且扣费失败仍返回成功（AI 已生成但未扣币）。两者都无账本，
 * 重试语义未定义，失败路径无法对账。
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type Tx = Prisma.TransactionClient;

export type ChargeOperation = "summarize" | "batch-feedback";
export type ChargeSource = "gift" | "paid";
export type ChargeState = "reserved" | "settled" | "released";

export interface BillingBalance {
  gift: number;
  paid: number;
  total: number;
}

export type ReserveResult =
  | {
      ok: true;
      chargeId: string;
      state: "reserved";
      source: ChargeSource;
      balance: BillingBalance;
      replayed: boolean;
    }
  | {
      ok: false;
      reason:
        "insufficient" | "user_not_found" | "already_settled" | "released";
      balance: BillingBalance;
    };

export type SettleResult =
  | {
      ok: true;
      chargeId: string;
      state: "settled";
      balance: BillingBalance;
      replayed: boolean;
    }
  | {
      ok: false;
      reason: "not_found" | "illegal_transition";
      currentState?: ChargeState;
      balance: BillingBalance;
    };

export type ReleaseResult =
  | {
      ok: true;
      chargeId: string;
      state: "released";
      source: ChargeSource | null;
      refunded: boolean;
      balance: BillingBalance;
      replayed: boolean;
    }
  | {
      ok: false;
      reason: "not_found" | "illegal_transition";
      currentState?: ChargeState;
      balance: BillingBalance;
    };

const EMPTY_BALANCE: BillingBalance = { gift: 0, paid: 0, total: 0 };

/** Prisma 唯一约束冲突；用鸭子类型判定以免在单测里构造 Prisma 内部错误 */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "P2002"
  );
}

async function readBalance(
  client: Tx | typeof prisma,
  userId: string,
): Promise<BillingBalance> {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { lekao_gift_coin: true, t_coin: true },
  });
  if (!user) return { ...EMPTY_BALANCE };
  const initialized = user.lekao_gift_coin !== -1;
  const gift = initialized ? Math.max(0, user.lekao_gift_coin) : 0;
  return { gift, paid: user.t_coin, total: gift + user.t_coin };
}

async function findCharge(userId: string, idempotencyKey: string) {
  return prisma.lekaoGenerationCharge.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey } },
  });
}

/**
 * 预留 1 枚 T-Coin（幂等）
 *
 * @param args.idempotencyKey 客户端生成的 UUID；同一逻辑请求重试必须复用
 */
export async function reserveCoin(args: {
  userId: string;
  idempotencyKey: string;
  operation: ChargeOperation;
  correlationId: string;
  amount?: number;
}): Promise<ReserveResult> {
  const { userId, idempotencyKey, operation, correlationId } = args;
  const amount = args.amount ?? 1;

  // 1. 已存在同一 key → 重放，绝不二次扣币
  const existing = await findCharge(userId, idempotencyKey);
  if (existing) return replayReserve(existing, userId);

  // 2. 首次：扣币 + 建账本行，同一事务
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!user) {
        return {
          ok: false,
          reason: "user_not_found",
          balance: { ...EMPTY_BALANCE },
        } as const;
      }

      // 优先扣赠送池，再扣共享充值池（原子条件 update，规避并发双扣）
      let source: ChargeSource | null = null;
      const giftHit = await tx.user.updateMany({
        where: { id: userId, lekao_gift_coin: { gte: amount } },
        data: { lekao_gift_coin: { decrement: amount } },
      });
      if (giftHit.count > 0) {
        source = "gift";
      } else {
        const paidHit = await tx.user.updateMany({
          where: { id: userId, t_coin: { gte: amount } },
          data: { t_coin: { decrement: amount } },
        });
        if (paidHit.count > 0) source = "paid";
      }

      if (!source) {
        return {
          ok: false,
          reason: "insufficient",
          balance: await readBalance(tx, userId),
        } as const;
      }

      const charge = await tx.lekaoGenerationCharge.create({
        data: {
          userId,
          idempotencyKey,
          operation,
          amount,
          source,
          state: "reserved",
          correlationId,
        },
      });

      return {
        ok: true,
        chargeId: charge.id,
        state: "reserved",
        source,
        balance: await readBalance(tx, userId),
        replayed: false,
      } as const;
    });
  } catch (err) {
    // 3. 同一 key 并发：唯一索引拦下，读回已存在的行做重放
    if (isUniqueViolation(err)) {
      const raced = await findCharge(userId, idempotencyKey);
      if (raced) return replayReserve(raced, userId);
    }
    throw err;
  }
}

type ChargeRow = {
  id: string;
  state: string;
  source: string | null;
  amount: number;
};

async function replayReserve(
  row: ChargeRow,
  userId: string,
): Promise<ReserveResult> {
  const balance = await readBalance(prisma, userId);
  const state = row.state as ChargeState;

  if (state === "reserved") {
    return {
      ok: true,
      chargeId: row.id,
      state: "reserved",
      source: (row.source as ChargeSource) ?? "gift",
      balance,
      replayed: true,
    };
  }
  if (state === "settled") {
    return { ok: false, reason: "already_settled", balance };
  }
  return { ok: false, reason: "released", balance };
}

/** 结算已预留的扣费（幂等）：reserved → settled，不动余额 */
export async function settleCoin(args: {
  userId: string;
  idempotencyKey: string;
}): Promise<SettleResult> {
  const { userId, idempotencyKey } = args;
  const updated = await prisma.lekaoGenerationCharge.updateMany({
    where: { userId, idempotencyKey, state: "reserved" },
    data: { state: "settled", settledAt: new Date() },
  });

  if (updated.count === 1) {
    const row = await findCharge(userId, idempotencyKey);
    return {
      ok: true,
      chargeId: row!.id,
      state: "settled",
      balance: await readBalance(prisma, userId),
      replayed: false,
    };
  }

  const row = await findCharge(userId, idempotencyKey);
  const balance = await readBalance(prisma, userId);
  if (!row) return { ok: false, reason: "not_found", balance };
  if (row.state === "settled") {
    return {
      ok: true,
      chargeId: row.id,
      state: "settled",
      balance,
      replayed: true,
    };
  }
  return {
    ok: false,
    reason: "illegal_transition",
    currentState: row.state as ChargeState,
    balance,
  };
}

/**
 * 释放已预留的扣费并**按原池返还**（幂等）：reserved → released
 *
 * 与 settle 一样只允许从 reserved 迁移；重复 release 返回 replayed=true 且不二次退款。
 */
export async function releaseCoin(args: {
  userId: string;
  idempotencyKey: string;
  reason: string;
}): Promise<ReleaseResult> {
  const { userId, idempotencyKey, reason } = args;

  return prisma.$transaction(async (tx) => {
    const row = await tx.lekaoGenerationCharge.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
    });
    if (!row) {
      return {
        ok: false,
        reason: "not_found",
        balance: await readBalance(tx, userId),
      } as const;
    }

    const state = row.state as ChargeState;
    if (state === "released") {
      return {
        ok: true,
        chargeId: row.id,
        state: "released",
        source: (row.source as ChargeSource) ?? null,
        refunded: false,
        balance: await readBalance(tx, userId),
        replayed: true,
      } as const;
    }
    if (state === "settled") {
      return {
        ok: false,
        reason: "illegal_transition",
        currentState: "settled",
        balance: await readBalance(tx, userId),
      } as const;
    }

    const source = (row.source as ChargeSource) ?? "gift";
    const amount = row.amount;

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { lekao_gift_coin: true, t_coin: true },
    });
    const beforeGift = user ? Math.max(0, user.lekao_gift_coin) : 0;
    const beforePaid = user ? user.t_coin : 0;
    const afterGift = source === "gift" ? beforeGift + amount : beforeGift;
    const afterPaid = source === "paid" ? beforePaid + amount : beforePaid;

    await tx.user.update({
      where: { id: userId },
      data:
        source === "gift"
          ? { lekao_gift_coin: afterGift }
          : { t_coin: afterPaid },
    });
    await tx.lekaoGenerationCharge.update({
      where: { id: row.id },
      data: { state: "released", releasedAt: new Date(), reason },
    });
    await tx.lekaoCoinLog.create({
      data: {
        userId,
        adminId: userId,
        amount,
        beforeGift,
        beforePaid,
        afterGift,
        afterPaid,
        reason,
      },
    });

    return {
      ok: true,
      chargeId: row.id,
      state: "released",
      source,
      refunded: true,
      balance: await readBalance(tx, userId),
      replayed: false,
    } as const;
  });
}
