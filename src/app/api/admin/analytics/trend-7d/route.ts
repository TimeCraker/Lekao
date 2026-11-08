import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDailyTrend } from "@/lib/analytics";
import { adminCache } from "@/lib/cache-admin";

// T44 · 7 天每日趋势（5min 缓存）
const get7dCached = adminCache(
  () => getDailyTrend(7),
  ["admin", "analytics", "trend-7d"],
  300,
);

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const days = await get7dCached();
    return NextResponse.json({ days });
  } catch (e) {
    console.error("[admin/analytics/trend-7d] error:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
