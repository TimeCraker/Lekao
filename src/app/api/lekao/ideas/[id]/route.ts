// ============================================
// Lekao · 灵感 API · DELETE 仅自己 (v2.2.0)
// ============================================
// 用户自己删除灵感（ON DELETE CASCADE 自动级联删 likes + comments）

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id } = await params;

    // 校验存在 + 所有权
    const idea = await prisma.lekaoIdea.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!idea) {
      return NextResponse.json({ error: "灵感不存在" }, { status: 404 });
    }
    if (idea.userId !== userId) {
      return NextResponse.json(
        { error: "无权删除他人的灵感" },
        { status: 403 },
      );
    }

    // 删除（CASCADE 自动删 likes + comments）
    await prisma.lekaoIdea.delete({ where: { id } });

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error("[lekao/ideas/[id] DELETE] error:", e);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
