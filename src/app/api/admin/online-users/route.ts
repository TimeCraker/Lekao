import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOnlineUserCount } from "@/lib/redis-online";

// T44 · 在线人数实时接口
// 5s 轮询（前端 useEffect + setInterval）
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const count = await getOnlineUserCount();
    return NextResponse.json({ online: count, asOf: Date.now() });
  } catch (e) {
    console.error("[admin/online-users] error:", e);
    return NextResponse.json({ online: 0, asOf: Date.now() });
  }
}
