// ============================================
// Lekao · 灵感点赞 API · POST toggle (v2.2.0)
// ============================================
// 联合主键天然防重复 → toggle = 存在则删，不存在则增

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
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

    // 校验灵感存在
    const idea = await prisma.lekaoIdea.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!idea) {
      return NextResponse.json({ error: "灵感不存在" }, { status: 404 });
    }

    // toggle
    const existing = await prisma.lekaoIdeaLike.findUnique({
      where: { ideaId_userId: { ideaId: id, userId } },
    });

    let liked: boolean;
    if (existing) {
      await prisma.lekaoIdeaLike.delete({
        where: { ideaId_userId: { ideaId: id, userId } },
      });
      liked = false;
    } else {
      await prisma.lekaoIdeaLike.create({
        data: { ideaId: id, userId },
      });
      liked = true;
    }

    const count = await prisma.lekaoIdeaLike.count({ where: { ideaId: id } });

    return NextResponse.json({ liked, count });
  } catch (e) {
    console.error("[lekao/ideas/[id]/like POST] error:", e);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
