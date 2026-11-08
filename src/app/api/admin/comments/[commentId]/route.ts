// ============================================
// Lekao · Admin 删除评论 API (v2.2.0 #2)
// ============================================
// DELETE 软删（status='banned'） + 审计
// 用软删而不是硬删：保持 partial unique index 有效，避免恢复后又能评论

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { commentId } = await params;

    const before = await prisma.lekaoIdeaComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        userEmail: true,
        content: true,
        status: true,
        ideaId: true,
      },
    });
    if (!before) {
      return NextResponse.json({ error: "评论不存在" }, { status: 404 });
    }
    if (before.status === "banned") {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    // 软删：status='banned'
    await prisma.lekaoIdeaComment.update({
      where: { id: commentId },
      data: { status: "banned" },
    });

    // 写审计日志
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id,
        targetUserId: null,
        action: "idea_comment_delete",
        details: JSON.stringify({
          commentId,
          ideaId: before.ideaId,
          userEmail: before.userEmail,
          contentPreview: before.content.slice(0, 50),
          statusBefore: before.status,
        }),
        ip:
          req.headers.get("x-forwarded-for") ??
          req.headers.get("x-real-ip") ??
          null,
      },
    });

    console.log(
      `[admin/comments DELETE] admin=${session.user.id} comment=${commentId} idea=${before.ideaId}`,
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/comments DELETE] error:", e);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
