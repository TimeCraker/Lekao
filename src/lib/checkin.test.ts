import { beforeEach, describe, expect, it, vi } from "vitest";

// computeCheckinState 依赖 prisma（DB 查询）；本测试只测纯逻辑层，
// 用最小 mock 隔离设施依赖，不触发真实 PrismaClient。
vi.mock("@/lib/prisma", () => ({
  prisma: {
    lekaoCheckin: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  AWARD_BY_DAY,
  CHECKIN_DAYS,
  REASON_PREFIX,
  calcStreakDay,
  computeCheckinState,
  dayKeyOf,
} from "./checkin";

const findUnique = vi.mocked(prisma.lekaoCheckin.findUnique);
const findFirst = vi.mocked(prisma.lekaoCheckin.findFirst);

// mock 只提供 computeCheckinState 实际读取的字段（由 select 决定），非完整 Prisma 行
type CheckinRow = NonNullable<
  Awaited<ReturnType<typeof prisma.lekaoCheckin.findUnique>>
>;
const partialRow = (o: Record<string, unknown>) => o as CheckinRow;

describe("签到常量（七日递增循环奖励）", () => {
  it("AWARD_BY_DAY：D1=2 每天递增至 D7=8", () => {
    expect(AWARD_BY_DAY).toEqual({ 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8 });
  });

  it("CHECKIN_DAYS = 7；REASON_PREFIX 用于流水可追溯", () => {
    expect(CHECKIN_DAYS).toBe(7);
    expect(REASON_PREFIX).toBe("每日签到 连续第");
  });
});

describe("dayKeyOf（Asia/Shanghai 自然日）", () => {
  it("UTC 23:59:59 仍属上海当日", () => {
    expect(dayKeyOf(new Date("2026-08-29T15:59:59Z"))).toBe("2026-08-29");
  });

  it("UTC 16:00:00（上海 00:00）翻到次日", () => {
    expect(dayKeyOf(new Date("2026-08-29T16:00:00Z"))).toBe("2026-08-30");
  });

  it("上海时区午间时刻 dayKey 为 YYYY-MM-DD", () => {
    expect(dayKeyOf(new Date("2026-01-01T04:30:00Z"))).toBe("2026-01-01");
    expect(dayKeyOf(new Date("2026-02-28T16:00:00Z"))).toBe("2026-03-01"); // 2026 非闰年
  });
});

describe("calcStreakDay（本次签到是第几天）", () => {
  it.each([
    ["昨天签 D1 → 今天 D2", "2026-08-28", 1, 2],
    ["昨天签 D6 → 今天 D7", "2026-08-28", 6, 7],
    ["昨天签满 D7 → 今天重置回 D1", "2026-08-28", 7, 1],
    ["昨天有记录但 streak 缺失 → 从 D1 起步", "2026-08-28", null, 1],
  ])("%s", (_name, lastDayKey, lastStreakDay, expected) => {
    expect(calcStreakDay(lastDayKey, lastStreakDay, "2026-08-28")).toBe(
      expected,
    );
  });

  it.each([
    ["昨天没签（中断）→ 重置 D1", "2026-08-26", 5],
    ["无历史记录 → D1", null, null],
  ])("%s", (_name, lastDayKey, lastStreakDay) => {
    expect(calcStreakDay(lastDayKey, lastStreakDay, "2026-08-28")).toBe(1);
  });

  it("今天已签过的 key ≠ 昨天 → 仍返回 D1（由 computeCheckinState 的 today 分支处理）", () => {
    expect(calcStreakDay("2026-08-29", 3, "2026-08-28")).toBe(1);
  });
});

describe("computeCheckinState（dashboard 状态直出）", () => {
  // 固定「上海 2026-08-29 20:00」：todayKey=2026-08-29, yesterdayKey=2026-08-28
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-29T12:00:00Z"));
    return () => vi.useRealTimers();
  });

  beforeEach(() => {
    findUnique.mockReset();
    findFirst.mockReset();
  });

  it("今日已签：nextStreakDay = D+1（满 7 回 1），奖励取表值", async () => {
    findUnique.mockResolvedValue(partialRow({ streakDay: 3 }));
    const r = await computeCheckinState("u1");
    expect(r).toEqual({
      todayCheckedIn: true,
      todayStreakDay: 3,
      currentStreakDay: 3,
      nextStreakDay: 4,
      nextAward: 5,
    });
  });

  it("今日已签 D7：next 回到 D1，奖励回 2", async () => {
    findUnique.mockResolvedValue(partialRow({ streakDay: 7 }));
    const r = await computeCheckinState("u1");
    expect(r.nextStreakDay).toBe(1);
    expect(r.nextAward).toBe(2);
  });

  it("今日未签、昨天已签 D2：current=2，next=D3 奖励 4", async () => {
    findUnique.mockResolvedValue(null);
    findFirst.mockResolvedValue(
      partialRow({ dayKey: "2026-08-28", streakDay: 2 }),
    );
    const r = await computeCheckinState("u1");
    expect(r).toEqual({
      todayCheckedIn: false,
      todayStreakDay: 0,
      currentStreakDay: 2,
      nextStreakDay: 3,
      nextAward: 4,
    });
  });

  it("今日未签、中断（最后一条非昨天）：current=0，next=D1 奖励 2", async () => {
    findUnique.mockResolvedValue(null);
    findFirst.mockResolvedValue(
      partialRow({ dayKey: "2026-08-26", streakDay: 6 }),
    );
    const r = await computeCheckinState("u1");
    expect(r).toEqual({
      todayCheckedIn: false,
      todayStreakDay: 0,
      currentStreakDay: 0,
      nextStreakDay: 1,
      nextAward: 2,
    });
  });

  it("首次签到（无任何记录）：全部从 D1 起步", async () => {
    findUnique.mockResolvedValue(null);
    findFirst.mockResolvedValue(null);
    const r = await computeCheckinState("u1");
    expect(r.todayCheckedIn).toBe(false);
    expect(r.currentStreakDay).toBe(0);
    expect(r.nextStreakDay).toBe(1);
    expect(r.nextAward).toBe(2);
  });
});
