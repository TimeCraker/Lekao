import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getOverviewMetrics,
  getDailyTrend,
  getHourly24h,
} from "@/lib/analytics";
import { BarChart7d } from "@/components/admin/svg-charts/BarChart7d";
import { TrendLine30d } from "@/components/admin/svg-charts/TrendLine30d";
import { SummaryFeedbackDualLine } from "@/components/admin/svg-charts/SummaryFeedbackDualLine";
import { HourlyHeat24h } from "@/components/admin/svg-charts/HourlyHeat24h";
import { AnalyticsOverviewStrip } from "@/components/admin/AnalyticsOverviewStrip";

// ⭐ T44 · 强制 dynamic（5min cache 也要实时拉取）
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  // server-side 直接调 lib 函数（走 5min unstable_cache）
  const [overview, trend7d, trend30d, hourly24h] = await Promise.all([
    getOverviewMetrics(),
    getDailyTrend(7),
    getDailyTrend(30),
    getHourly24h(),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-2xl font-semibold text-ink">数据分析</h1>
        <p className="text-sm text-ink-muted mt-1">
          累计用户 / 每日活跃 / 24h 高峰 / 7 天 + 30 天趋势（5min 自动刷新）
        </p>
      </header>

      {/* 5 数字卡横条（server 注入 initial + client 5min 轮询） */}
      <AnalyticsOverviewStrip initialOverview={overview} />

      {/* 4 个 SVG 图（2x2 grid） */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="7 天 DAU">
          <BarChart7d data={trend7d} />
        </ChartCard>
        <ChartCard title="30 天使用趋势">
          <TrendLine30d data={trend30d} />
        </ChartCard>
        <ChartCard title="小结 vs 反馈（7 天）">
          <SummaryFeedbackDualLine data={trend7d} />
        </ChartCard>
        <ChartCard title="24h 高峰分布">
          <HourlyHeat24h data={hourly24h} />
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-ink">{title}</h3>
      {children}
    </div>
  );
}
