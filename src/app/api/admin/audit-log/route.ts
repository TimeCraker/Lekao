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
    const adminId = searchParams.get("adminId");
    const action = searchParams.get("action");

    const where: Record<string, unknown> = {};
    if (adminId) where.adminId = adminId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // 关联 admin/targetUser 信息
    const userIds = Array.from(
      new Set([
        ...logs.map((l) => l.adminId),
        ...logs.filter((l) => l.targetUserId).map((l) => l.targetUserId!),
      ]),
    );
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const enriched = logs.map((l) => ({
      ...l,
      admin: userMap[l.adminId] ?? { email: "(已删除)", name: null },
      targetUser: l.targetUserId
        ? userMap[l.targetUserId] ?? { email: "(已删除)", name: null }
        : null,
    }));

    return NextResponse.json({ logs: enriched, total, page, limit });
  } catch (e) {
    console.error("[admin/audit-log] error:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}