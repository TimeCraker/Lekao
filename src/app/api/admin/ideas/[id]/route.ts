// ============================================
// Lekao · Admin 删除灵感 API (v2.2.0 #2)
// ============================================
// DELETE 删灵感 + 审计（likes / comments 通过 onDelete: Cascade 自动删）

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const before = await prisma.lekaoIdea.findUnique({
      where: { id },
      select: { userEmail: true, title: true, status: true },
    });
    if (!before) {
      return NextResponse.json({ error: "灵感不存在" }, { status: 404 });
    }

    await prisma.lekaoIdea.delete({ where: { id } });

    // 写审计日志
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id,
        targetUserId: null,
        action: "idea_delete",
        details: JSON.stringify({
          ideaId: id,
          title: before.title,
          userEmail: before.userEmail,
          statusBefore: before.status,
        }),
        ip:
          req.headers.get("x-forwarded-for") ??
          req.headers.get("x-real-ip") ??
          null,
      },
    });

    console.log(
      `[admin/ideas DELETE] admin=${session.user.id} idea=${id} title="${before.title}"`,
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/ideas DELETE] error:", e);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}