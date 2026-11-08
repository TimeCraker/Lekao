import { prisma } from "./prisma";
import { getOnlineUserCount, getPeakOnlineCount } from "./redis-online";

// ============================================
// T44 · 管理后台数据分析 · 5 个聚合函数
// ============================================
// 数据源：lekao_class_summaries / lekao_class_feedbacks / lekao_coin_log
// 错题集纯前端 IndexedDB（BRD §7.6 既定），不在服务端聚合
//
// 全部走 groupBy + Set 合并，3 张表独立查，避免 raw SQL UNION

export interface OverviewMetrics {
  /** 累计用户：3 张表 user_id 去重 = "实际用过 Lekao 的人" */
  totalUsers: number;
  /** 当前在线人数：30s 滑动窗口（实时，不 cache） */
  currentOnline: number;
  /** 历史最大在线人数：Redis peak 记录（自上线起） */
  peakOnline: number;
  /** 今日小结生成次数 */
  todaySummaries: number;
  /** 今日反馈生成次数 */
  todayFeedbacks: number;
  /** 错题次数：纯前端数据，服务端拿不到 */
  todayMistake: null;
}

export interface DailyMetric {
  date: string; // YYYY-MM-DD
  dau: number;
  summaries: number;
  feedbacks: number;
}

export interface HourlyMetric {
  hour: number; // 0-23
  count: number; // 该小时内的生成次数（summaries + feedbacks）
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * 累计用户 = summaries ∪ feedbacks ∪ coin_log 的 userId 去重
 * 字面"用过 Lekao 的人"
 */
export async function getTotalUsers(): Promise<number> {
  const [s, f, c] = await Promise.all([
    prisma.lekaoClassSummary.groupBy({ by: ["userId"] }),
    prisma.lekaoClassFeedback.groupBy({ by: ["userId"] }),
    prisma.lekaoCoinLog.groupBy({ by: ["userId"] }),
  ]);
  const set = new Set<string>();
  for (const x of s) set.add(x.userId);
  for (const x of f) set.add(x.userId);
  for (const x of c) set.add(x.userId);
  return set.size;
}

export async function getOverviewMetrics(): Promise<OverviewMetrics> {
  const todayStart = startOfDay(new Date());

  const [
    totalUsers,
    currentOnline,
    peakOnline,
    todaySummaries,
    todayFeedbacks,
  ] = await Promise.all([
    getTotalUsers(),
    getOnlineUserCount(),
    getPeakOnlineCount(),
    prisma.lekaoClassSummary.count({
      where: { createdAt: { gte: todayStart } },
    }),
    prisma.lekaoClassFeedback.count({
      where: { createdAt: { gte: todayStart } },
    }),
  ]);

  return {
    totalUsers,
    currentOnline,
    peakOnline,
    todaySummaries,
    todayFeedbacks,
    todayMistake: null,
  };
}

/**
 * N 天每日趋势（按天聚合 DAU + 小结 + 反馈）
 * @param days 7 / 30
 */
export async function getDailyTrend(days: number): Promise<DailyMetric[]> {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const [summaries, feedbacks] = await Promise.all([
    prisma.lekaoClassSummary.findMany({
      where: { createdAt: { gte: start } },
      select: { userId: true, createdAt: true },
    }),
    prisma.lekaoClassFeedback.findMany({
      where: { createdAt: { gte: start } },
      select: { userId: true, createdAt: true },
    }),
  ]);

  // 初始化 N 天 Map（0 也要返回，前端图表才不会"断柱"）
  const dailyMap = new Map<
    string,
    { dau: Set<string>; sum: number; fb: number }
  >();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dailyMap.set(dayKey(d), { dau: new Set(), sum: 0, fb: 0 });
  }

  for (const s of summaries) {
    const m = dailyMap.get(dayKey(s.createdAt));
    if (m) {
      m.dau.add(s.userId);
      m.sum++;
    }
  }
  for (const f of feedbacks) {
    const m = dailyMap.get(dayKey(f.createdAt));
    if (m) {
      m.dau.add(f.userId);
      m.fb++;
    }
  }

  return Array.from(dailyMap.entries()).map(([date, m]) => ({
    date,
    dau: m.dau.size,
    summaries: m.sum,
    feedbacks: m.fb,
  }));
}

/**
 * 24h 高峰（按小时聚合 summaries + feedbacks 总次数）
 * 揭示"助教什么时候用得最多"
 */
export async function getHourly24h(): Promise<HourlyMetric[]> {
  const start = new Date();
  start.setHours(start.getHours() - 23, 0, 0, 0);

  const [summaries, feedbacks] = await Promise.all([
    prisma.lekaoClassSummary.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true },
    }),
    prisma.lekaoClassFeedback.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true },
    }),
  ]);

  // 初始化 24 小时 0 桶
  const hourMap = new Map<number, number>();
  for (let h = 0; h < 24; h++) hourMap.set(h, 0);

  for (const s of [...summaries, ...feedbacks]) {
    const h = s.createdAt.getHours();
    hourMap.set(h, (hourMap.get(h) ?? 0) + 1);
  }

  return Array.from(hourMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([hour, count]) => ({ hour, count }));
}
