// ============================================
// Lekao · Admin 灵感状态变更 API (v2.2.0 #2)
// ============================================
// PATCH 改状态（open/planned/done）+ 写审计

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const VALID_STATUS = ["open", "planned", "done"] as const;
type IdeaStatus = (typeof VALID_STATUS)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body as { status?: string };

    if (!status || !VALID_STATUS.includes(status as IdeaStatus)) {
      return NextResponse.json(
        { error: "status 必须为 open / planned / done" },
        { status: 400 },
      );
    }

    const before = await prisma.lekaoIdea.findUnique({
      where: { id },
      select: { status: true, userEmail: true, title: true },
    });
    if (!before) {
      return NextResponse.json({ error: "灵感不存在" }, { status: 404 });
    }
    if (before.status === status) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    const updated = await prisma.lekaoIdea.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });

    // 写审计日志
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id,
        targetUserId: null,
        action: "idea_status_change",
        details: JSON.stringify({
          ideaId: id,
          title: before.title,
          userEmail: before.userEmail,
          before: before.status,
          after: status,
        }),
        ip:
          req.headers.get("x-forwarded-for") ??
          req.headers.get("x-real-ip") ??
          null,
      },
    });

    console.log(
      `[admin/ideas status] admin=${session.user.id} idea=${id} ${before.status}→${status}`,
    );

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[admin/ideas status PATCH] error:", e);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}