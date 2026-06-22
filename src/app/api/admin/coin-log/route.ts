import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));
    const userId = searchParams.get("userId");
    const adminId = searchParams.get("adminId");
    const email = searchParams.get("email")?.trim();

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (adminId) where.adminId = adminId;
    if (email) {
      // 模糊查用户 ID 列表再过滤
      const matched = await prisma.user.findMany({
        where: { email: { contains: email, mode: "insensitive" } },
        select: { id: true },
        take: 200,
      });
      const ids = matched.map((u) => u.id);
      if (ids.length === 0) {
        return NextResponse.json({ logs: [], total: 0, page, limit });
      }
      where.userId = { in: ids };
    }

    const [logs, total] = await Promise.all([
      prisma.lekaoCoinLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lekaoCoinLog.count({ where }),
    ]);

    // 关联 user/admin 信息
    const userIds = Array.from(new Set([...logs.map((l) => l.userId), ...logs.map((l) => l.adminId)]));
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const enriched = logs.map((l) => ({
      ...l,
      user: userMap[l.userId] ?? { email: "(已删除)", name: null },
      admin: userMap[l.adminId] ?? { email: "(已删除)", name: null },
    }));

    return NextResponse.json({ logs: enriched, total, page, limit });
  } catch (e) {
    console.error("[admin/coin-log] error:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}