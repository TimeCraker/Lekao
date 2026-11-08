import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getHourly24h } from "@/lib/analytics";
import { adminCache } from "@/lib/cache-admin";

// T44 · 24h 高峰（按小时聚合 summaries + feedbacks，5min 缓存）
const get24hCached = adminCache(
  getHourly24h,
  ["admin", "analytics", "hourly-24h"],
  300,
);

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const hours = await get24hCached();
    return NextResponse.json({ hours });
  } catch (e) {
    console.error("[admin/analytics/hourly-24h] error:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
