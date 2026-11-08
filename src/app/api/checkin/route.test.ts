import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

/**
 * S01 T-006 / AC-015 · 每日签到幂等（路由级）
 *
 * 覆盖：未登录、同日重放、并发唯一冲突（旧实现返回 500）、七日循环、中断重置、
 * 未初始化余额（-1）、余额写入必须是原子 increment 而非读后写绝对值、coin log 审计、用户不存在。
 */
type FakeCheckin = { dayKey: string; streakDay: number; award: number };

const { state, authMock } = vi.hoisted(() => {
  const state = {
    checkins: [] as FakeCheckin[],
    user: { lekao_gift_coin: 5, t_coin: 1 } as {
      lekao_gift_coin: number;
      t_coin: number;
    },
    logs: [] as Record<string, unknown>[],
    lastCheckinQueryReturns: null as null | {
      dayKey: string;
      streakDay: number;
    },
    createError: null as null | Error,
    userMissing: false,
    updateManyCalls: [] as Record<string, unknown>[],
  };
  return { state, authMock: vi.fn() };
});

vi.mock("@/lib/auth", () => ({ auth: authMock }));

vi.mock("@/lib/prisma", () => {
  const db = {
    lekaoCheckin: {
      async findUnique({
        where,
      }: {
        where: { userId_dayKey: { userId: string; dayKey: string } };
      }) {
        return (
          state.checkins.find((c) => c.dayKey === where.userId_dayKey.dayKey) ??
          null
        );
      },
      async findFirst() {
        return state.lastCheckinQueryReturns;
      },
      async create({ data }: { data: FakeCheckin }) {
        if (state.createError) throw state.createError;
        state.checkins.push(data);
        return data;
      },
    },
    user: {
      async updateMany({ where, data }: { where: unknown; data: unknown }) {
        state.updateManyCalls.push({ where, data });
        if (state.userMissing) return { count: 0 };
        const d = data as {
          lekao_gift_coin?: number | { increment: number };
        };
        if (d.lekao_gift_coin === undefined) return { count: 0 };
        if (typeof d.lekao_gift_coin === "object") {
          if (state.user.lekao_gift_coin < 0) return { count: 0 };
          state.user.lekao_gift_coin += d.lekao_gift_coin.increment;
        } else {
          if (state.user.lekao_gift_coin >= 0) return { count: 0 };
          state.user.lekao_gift_coin = d.lekao_gift_coin;
        }
        return { count: 1 };
      },
      async findUnique() {
        return state.userMissing ? null : { ...state.user };
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
  return { prisma: db };
});

function p2002(): Error & { code: string } {
  const err = new Error("Unique constraint failed") as Error & { code: string };
  err.code = "P2002";
  return err;
}

beforeEach(() => {
  state.checkins = [];
  state.user = { lekao_gift_coin: 5, t_coin: 1 };
  state.logs = [];
  state.lastCheckinQueryReturns = null;
  state.createError = null;
  state.userMissing = false;
  state.updateManyCalls = [];
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: "u1" } });
});

type Body = {
  ok?: boolean;
  alreadyCheckedIn?: boolean;
  award?: number;
  streakDay?: number;
  newGift?: number;
  newTotal?: number;
  code?: string;
  correlationId?: string;
  recoveryAction?: { kind: string; label: string };
};

async function post(): Promise<{ status: number; body: Body }> {
  const res = await POST();
  return { status: res.status, body: (await res.json()) as Body };
}

describe("POST /api/checkin", () => {
  it("未登录返回 401 + 错误契约", async () => {
    authMock.mockResolvedValue(null);
    const { status, body } = await post();
    expect(status).toBe(401);
    expect(body.code).toBe("UNAUTHENTICATED");
    expect(body.correlationId).toMatch(/^lekao-checkin-/);
    expect(body.recoveryAction?.label.length).toBeGreaterThan(0);
  });

  it("首次签到发放第 1 天奖励并原子加币", async () => {
    const { status, body } = await post();
    expect(status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      streakDay: 1,
      award: 2,
      newGift: 7,
      newTotal: 8,
    });

    // 余额必须是 increment（而非读后写绝对值），否则会覆盖并发的 AI 扣费
    const bump = state.updateManyCalls.find((c) => {
      const d = c.data as { lekao_gift_coin?: unknown };
      return (
        typeof d.lekao_gift_coin === "object" &&
        d.lekao_gift_coin !== null &&
        "increment" in (d.lekao_gift_coin as object)
      );
    });
    expect(bump, "缺少 increment 形式的余额写入").toBeTruthy();

    // 审计流水：before = after - award
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0]).toMatchObject({
      userId: "u1",
      amount: 2,
      beforeGift: 5,
      afterGift: 7,
      beforePaid: 1,
      afterPaid: 1,
    });
  });

  it("未初始化余额（-1）时置为奖励值，before 记为 0", async () => {
    state.user = { lekao_gift_coin: -1, t_coin: 0 };
    const { body } = await post();
    expect(body).toMatchObject({ ok: true, award: 2, newGift: 2, newTotal: 2 });
    expect(state.logs[0]).toMatchObject({ beforeGift: 0, afterGift: 2 });
  });

  it("同日重复签到返回 alreadyCheckedIn 且不改余额", async () => {
    state.checkins.push({ dayKey: todayKey(), streakDay: 3, award: 4 });
    const { status, body } = await post();
    expect(status).toBe(200);
    expect(body).toMatchObject({
      ok: false,
      alreadyCheckedIn: true,
      streakDay: 3,
      award: 4,
    });
    expect(state.user.lekao_gift_coin).toBe(5);
    expect(state.logs).toHaveLength(0);
  });

  it("并发重复（唯一冲突）返回 alreadyCheckedIn，不再 500", async () => {
    state.createError = p2002();
    state.checkins.push({ dayKey: todayKey(), streakDay: 1, award: 2 });
    const { status, body } = await post();
    expect(status).toBe(200);
    expect(body).toMatchObject({ ok: false, alreadyCheckedIn: true, award: 2 });
  });

  it("七日后回到第 1 天奖励（昨天签到且 streakDay=7）", async () => {
    state.lastCheckinQueryReturns = { dayKey: yesterdayKey(), streakDay: 7 };
    const { body } = await post();
    expect(body).toMatchObject({ ok: true, streakDay: 1, award: 2 });
  });

  it("中断后续签回到第 1 天（上次签到早于昨天）", async () => {
    state.lastCheckinQueryReturns = { dayKey: "2026-01-01", streakDay: 5 };
    const { body } = await post();
    expect(body).toMatchObject({ ok: true, streakDay: 1, award: 2 });
  });

  it("昨天签到则递增（streakDay=2 → 3 天奖励 4）", async () => {
    state.lastCheckinQueryReturns = { dayKey: yesterdayKey(), streakDay: 2 };
    const { body } = await post();
    expect(body).toMatchObject({ ok: true, streakDay: 3, award: 4 });
  });

  it("用户不存在返回 404 + 错误契约", async () => {
    state.userMissing = true;
    const { status, body } = await post();
    expect(status).toBe(404);
    expect(body.code).toBe("NOT_FOUND");
  });
});

function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function yesterdayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() - 86_400_000));
}
