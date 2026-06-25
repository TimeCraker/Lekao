// ============================================
// Lekao · 灵感评论 API · DELETE 仅自己 (v2.2.0)
// ============================================
// 决策 #10：删评论 = 软删除 (status='visible' → 'banned')
// 行保留 + partial unique index 仍生效 → 永久禁该灵感评论位

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    const userId = session.user.id;
    const { commentId } = await params;

    const comment = await prisma.lekaoIdeaComment.findUnique({
      where: { id: commentId },
      select: { userId: true, ideaId: true, status: true },
    });
    if (!comment) {
      return NextResponse.json({ error: "评论不存在" }, { status: 404 });
    }
    if (comment.userId !== userId) {
      return NextResponse.json({ error: "无权删除他人的评论" }, { status: 403 });
    }
    if (comment.status !== "visible") {
      return NextResponse.json({ error: "评论已撤回" }, { status: 409 });
    }

    // 软删除：UPDATE status='banned'（partial unique index 仍生效）
    await prisma.lekaoIdeaComment.update({
      where: { id: commentId },
      data: { status: "banned" },
    });

    return NextResponse.json({ ok: true, commentId });
  } catch (e) {
    console.error("[lekao/ideas/[id]/comments/[commentId] DELETE] error:", e);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}