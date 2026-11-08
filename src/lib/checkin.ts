import { prisma } from "@/lib/prisma";
import type { CheckinState } from "@/lib/checkin-types";
export type { CheckinState };

// 七日递增循环奖励：每天 +1，从 2 起
// D1=2 D2=3 D3=4 D4=5 D5=6 D6=7 D7=8 · 签满 7 天重置回 D1；中断也重置
export const AWARD_BY_DAY: Record<number, number> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: 7,
  7: 8,
};
export const CHECKIN_DAYS = 7;
export const REASON_PREFIX = "每日签到 连续第";

/** Asia/Shanghai 自然日 key (YYYY-MM-DD) */
export function dayKeyOf(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** 本次签到是第几天（基于上次签到记录） */
export function calcStreakDay(
  lastDayKey: string | null,
  lastStreakDay: number | null,
  yesterdayKey: string,
): number {
  if (lastDayKey === yesterdayKey) {
    return lastStreakDay === 7 ? 1 : (lastStreakDay ?? 0) + 1;
  }
  return 1;
}

/** 算当前用户的签到状态（dashboard 首屏直出用） */
export async function computeCheckinState(
  userId: string,
): Promise<CheckinState> {
  const todayKey = dayKeyOf();
  const yesterdayKey = dayKeyOf(new Date(Date.now() - 86_400_000));

  const [today, last] = await Promise.all([
    prisma.lekaoCheckin.findUnique({
      where: { userId_dayKey: { userId, dayKey: todayKey } },
      select: { streakDay: true },
    }),
    prisma.lekaoCheckin.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { dayKey: true, streakDay: true },
    }),
  ]);

  if (today) {
    // 今日已签
    const nextStreakDay = today.streakDay === 7 ? 1 : today.streakDay + 1;
    return {
      todayCheckedIn: true,
      todayStreakDay: today.streakDay,
      currentStreakDay: today.streakDay,
      nextStreakDay,
      nextAward: AWARD_BY_DAY[nextStreakDay] ?? 2,
    };
  }

  // 今日未签
  let currentStreakDay = 0;
  let nextStreakDay = 1;
  if (last?.dayKey === yesterdayKey) {
    currentStreakDay = last.streakDay;
    nextStreakDay = last.streakDay === 7 ? 1 : last.streakDay + 1;
  }
  return {
    todayCheckedIn: false,
    todayStreakDay: 0,
    currentStreakDay,
    nextStreakDay,
    nextAward: AWARD_BY_DAY[nextStreakDay] ?? 2,
  };
}
