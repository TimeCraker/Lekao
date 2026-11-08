import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOverviewMetrics } from "@/lib/analytics";

// T44 · 5 数字卡 JSON
// 注意：currentOnline / peakOnline 是 Redis 实时数据，不走 5min cache
// DB 数据（totalUsers / todaySummaries / todayFeedbacks）走 5min cache
// 折中：DB 用 cache wrapper 包一层，Redis 直接实时读

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const overview = await getOverviewMetrics();
    return NextResponse.json(overview);
  } catch (e) {
    console.error("[admin/analytics/overview] error:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
