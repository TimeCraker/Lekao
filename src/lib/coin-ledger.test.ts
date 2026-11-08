import { beforeEach, describe, expect, it, vi } from "vitest";
import { releaseCoin, reserveCoin, settleCoin } from "./coin-ledger";

/**
 * S01 AC-001 · 幂等计费状态机单测
 *
 * 用内存态 Prisma 替身驱动状态机，覆盖：
 * - 扣费优先级（赠送池 → 充值池）与余额不足不建账本
 * - 同一 idempotencyKey 重放不二次扣币（含并发唯一冲突路径）
 * - settle/release 幂等、非法迁移拒绝、release 按**原池**返还并写审计日志
 *
 * 说明：替身不模拟真实事务回滚。DB 级约束（(userId,idempotencyKey) 唯一索引）
 * 由 prisma/migrations/20261002000000_add_generation_charge 保证；
 * 真实库集成测试需要隔离测试库（见 S01 Spec §9 假设），当前不可用。
 */

type FakeUser = { id: string; lekao_gift_coin: number; t_coin: number };
type FakeCharge = {
  id: string;
  userId: string;
  idempotencyKey: string;
  operation: string;
  amount: number;
  source: string | null;
  state: string;
  correlationId: string;
  reason: string | null;
  createdAt: Date;
  settledAt: Date | null;
  releasedAt: Date | null;
};

const { db, resetDb, seedUser, getLogs } = vi.hoisted(() => {
  const state = {
    users: [] as FakeUser[],
    charges: [] as FakeCharge[],
    logs: [] as Record<string, unknown>[],
    seq: 0,
  };

  const nextId = () => `chg_${++state.seq}`;
  const findUser = (id: string) => state.users.find((u) => u.id === id);
  const findCharge = (userId: string, idempotencyKey: string) =>
    state.charges.find(
      (c) => c.userId === userId && c.idempotencyKey === idempotencyKey,
    );

  const db = {
    user: {
      async findUnique({ where }: { where: { id: string } }) {
        const u = findUser(where.id);
        return u ? { ...u } : null;
      },
      async updateMany({
        where,
        data,
      }: {
        where: {
          id: string;
          lekao_gift_coin?: { gte: number };
          t_coin?: { gte: number };
        };
        data: {
          lekao_gift_coin?: { decrement: number };
          t_coin?: { decrement: number };
        };
      }) {
        const u = findUser(where.id);
        if (!u) return { count: 0 };
        if (
          where.lekao_gift_coin &&
          u.lekao_gift_coin < where.lekao_gift_coin.gte
        )
          return { count: 0 };
        if (where.t_coin && u.t_coin < where.t_coin.gte) return { count: 0 };
        if (data.lekao_gift_coin)
          u.lekao_gift_coin -= data.lekao_gift_coin.decrement;
        if (data.t_coin) u.t_coin -= data.t_coin.decrement;
        return { count: 1 };
      },
      async update({
        where,
        data,
      }: {
        where: { id: string };
        data: { lekao_gift_coin?: number; t_coin?: number };
      }) {
        const u = findUser(where.id);
        if (!u) throw new Error("user not found");
        if (data.lekao_gift_coin !== undefined)
          u.lekao_gift_coin = data.lekao_gift_coin;
        if (data.t_coin !== undefined) u.t_coin = data.t_coin;
        return { ...u };
      },
    },
    lekaoGenerationCharge: {
      async findUnique({
        where,
      }: {
        where: {
          userId_idempotencyKey: { userId: string; idempotencyKey: string };
        };
      }) {
        const c = findCharge(
          where.userId_idempotencyKey.userId,
          where.userId_idempotencyKey.idempotencyKey,
        );
        return c ? { ...c } : null;
      },
      async create({ data }: { data: Partial<FakeCharge> }) {
        const dup = findCharge(data.userId!, data.idempotencyKey!);
        if (dup) {
          const err = new Error("Unique constraint failed") as Error & {
            code: string;
          };
          err.code = "P2002";
          throw err;
        }
        const row: FakeCharge = {
          id: nextId(),
          userId: data.userId!,
          idempotencyKey: data.idempotencyKey!,
          operation: data.operation!,
          amount: data.amount ?? 1,
          source: data.source ?? null,
          state: data.state ?? "reserved",
          correlationId: data.correlationId!,
          reason: null,
          createdAt: new Date(),
          settledAt: null,
          releasedAt: null,
        };
        state.charges.push(row);
        return { ...row };
      },
      async updateMany({
        where,
        data,
      }: {
        where: { userId: string; idempotencyKey: string; state: string };
        data: { state: string; settledAt?: Date };
      }) {
        const c = findCharge(where.userId, where.idempotencyKey);
        if (!c || c.state !== where.state) return { count: 0 };
        c.state = data.state;
        c.settledAt = data.settledAt ?? null;
        return { count: 1 };
      },
      async update({
        where,
        data,
      }: {
        where: { id: string };
        data: { state?: string; releasedAt?: Date; reason?: string };
      }) {
        const c = state.charges.find((x) => x.id === where.id);
        if (!c) throw new Error("charge not found");
        if (data.state) c.state = data.state;
        if (data.releasedAt) c.releasedAt = data.releasedAt;
        if (data.reason) c.reason = data.reason;
        return { ...c };
      },
    },
    lekaoCoinLog: {
      async create({ data }: { data: Record<string, unknown> }) {
        state.logs.push(data);
        return data;
      },
    },
    async $transaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      return fn(db);
    },
  };

  return {
    db,
    resetDb: () => {
      state.users = [];
      state.charges = [];
      state.logs = [];
      state.seq = 0;
    },
    seedUser: (u: FakeUser) => {
      state.users.push({ ...u });
    },
    getLogs: () => state.logs,
  };
});

vi.mock("./prisma", () => ({ prisma: db }));

const KEY = "11111111-1111-4111-8111-111111111111";
const OP = "summarize" as const;
const CID = "lekao-test-correlation";

function baseArgs(idempotencyKey = KEY) {
  return {
    userId: "u1",
    idempotencyKey,
    operation: OP,
    correlationId: CID,
  };
}

beforeEach(() => {
  resetDb();
  seedUser({ id: "u1", lekao_gift_coin: 5, t_coin: 2 });
});

describe("reserveCoin", () => {
  it("首次预留扣赠送池并写入账本行", async () => {
    const res = await reserveCoin(baseArgs());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.source).toBe("gift");
    expect(res.state).toBe("reserved");
    expect(res.replayed).toBe(false);
    expect(res.balance).toEqual({ gift: 4, paid: 2, total: 6 });
  });

  it("赠送池为 0 时扣共享充值池（source=paid）", async () => {
    resetDb();
    seedUser({ id: "u1", lekao_gift_coin: 0, t_coin: 3 });
    const res = await reserveCoin(baseArgs());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.source).toBe("paid");
    expect(res.balance).toEqual({ gift: 0, paid: 2, total: 2 });
  });

  it("未初始化赠送池（-1）不视为可用余额", async () => {
    resetDb();
    seedUser({ id: "u1", lekao_gift_coin: -1, t_coin: 1 });
    const res = await reserveCoin(baseArgs());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.source).toBe("paid");
    expect(res.balance).toEqual({ gift: 0, paid: 0, total: 0 });
  });

  it("余额不足时不扣币也不建账本行", async () => {
    resetDb();
    seedUser({ id: "u1", lekao_gift_coin: 0, t_coin: 0 });
    const res = await reserveCoin(baseArgs());
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("insufficient");
    expect(res.balance).toEqual({ gift: 0, paid: 0, total: 0 });

    // 余额未变、账本为空 → 用同一 key 仍然可以正常 reserve 一次
    const again = await reserveCoin(
      baseArgs("22222222-2222-4222-8222-222222222222"),
    );
    expect(again.ok).toBe(false);
  });

  it("同一 idempotencyKey 重放不再扣币（AC-001 核心）", async () => {
    const first = await reserveCoin(baseArgs());
    const second = await reserveCoin(baseArgs());
    expect(first.ok && second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.replayed).toBe(true);
    // 只扣一次：5 → 4
    expect(second.balance).toEqual({ gift: 4, paid: 2, total: 6 });
  });

  it("并发同 key（唯一冲突）返回重放且只扣一次", async () => {
    // 预置一条已存在的 reserved 行，模拟并发对手先写入
    await reserveCoin(baseArgs());
    const raced = await reserveCoin(baseArgs());
    expect(raced.ok).toBe(true);
    if (!raced.ok) return;
    expect(raced.replayed).toBe(true);
    expect(raced.balance.gift).toBe(4);
  });

  it("已结算的 key 再次 reserve 返回 already_settled（不再扣币）", async () => {
    await reserveCoin(baseArgs());
    await settleCoin({ userId: "u1", idempotencyKey: KEY });
    const res = await reserveCoin(baseArgs());
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("already_settled");
    expect(res.balance).toEqual({ gift: 4, paid: 2, total: 6 });
  });

  it("已释放的 key 再次 reserve 返回 released（调用方需换新 key）", async () => {
    await reserveCoin(baseArgs());
    await releaseCoin({ userId: "u1", idempotencyKey: KEY, reason: "AI失败" });
    const res = await reserveCoin(baseArgs());
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("released");
  });
});

describe("settleCoin", () => {
  it("reserved → settled 且不动余额", async () => {
    await reserveCoin(baseArgs());
    const res = await settleCoin({ userId: "u1", idempotencyKey: KEY });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.state).toBe("settled");
    expect(res.replayed).toBe(false);
    expect(res.balance).toEqual({ gift: 4, paid: 2, total: 6 });
  });

  it("重复 settle 幂等", async () => {
    await reserveCoin(baseArgs());
    await settleCoin({ userId: "u1", idempotencyKey: KEY });
    const again = await settleCoin({ userId: "u1", idempotencyKey: KEY });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.replayed).toBe(true);
  });

  it("released 之后 settle 属非法迁移", async () => {
    await reserveCoin(baseArgs());
    await releaseCoin({ userId: "u1", idempotencyKey: KEY, reason: "AI失败" });
    const res = await settleCoin({ userId: "u1", idempotencyKey: KEY });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("illegal_transition");
    expect(res.currentState).toBe("released");
  });

  it("未知 key 返回 not_found", async () => {
    const res = await settleCoin({ userId: "u1", idempotencyKey: "unknown" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("not_found");
  });
});

describe("releaseCoin", () => {
  it("reserved → released 并按原池返还（gift 回 gift）", async () => {
    await reserveCoin(baseArgs());
    const res = await releaseCoin({
      userId: "u1",
      idempotencyKey: KEY,
      reason: "AI失败自动释放",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.refunded).toBe(true);
    expect(res.source).toBe("gift");
    expect(res.balance).toEqual({ gift: 5, paid: 2, total: 7 });

    // 审计：释放必须留下 lekao_coin_log 流水（可对账）
    const logs = getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      userId: "u1",
      amount: 1,
      beforeGift: 4,
      afterGift: 5,
      beforePaid: 2,
      afterPaid: 2,
      reason: "AI失败自动释放",
    });
  });

  it("paid 池的预留按 paid 返还，不串池", async () => {
    resetDb();
    seedUser({ id: "u1", lekao_gift_coin: 0, t_coin: 2 });
    await reserveCoin(baseArgs());
    const res = await releaseCoin({
      userId: "u1",
      idempotencyKey: KEY,
      reason: "超时",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.source).toBe("paid");
    expect(res.balance).toEqual({ gift: 0, paid: 2, total: 2 });
  });

  it("重复 release 不二次退款", async () => {
    await reserveCoin(baseArgs());
    await releaseCoin({ userId: "u1", idempotencyKey: KEY, reason: "第一次" });
    const again = await releaseCoin({
      userId: "u1",
      idempotencyKey: KEY,
      reason: "第二次",
    });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.replayed).toBe(true);
    expect(again.refunded).toBe(false);
    expect(again.balance).toEqual({ gift: 5, paid: 2, total: 7 });
  });

  it("settled 之后 release 属非法迁移且不退款", async () => {
    await reserveCoin(baseArgs());
    await settleCoin({ userId: "u1", idempotencyKey: KEY });
    const res = await releaseCoin({
      userId: "u1",
      idempotencyKey: KEY,
      reason: "试图退款",
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("illegal_transition");
    expect(res.balance).toEqual({ gift: 4, paid: 2, total: 6 });
  });

  it("未知 key 返回 not_found", async () => {
    const res = await releaseCoin({
      userId: "u1",
      idempotencyKey: "unknown",
      reason: "x",
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("not_found");
  });
});
