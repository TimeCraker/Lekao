// ============================================
// Lekao · Admin 灵感列表 API (v2.2.0 #2)
// ============================================
// GET 列表（含状态过滤 + 搜索 + 分页）

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
    const status = searchParams.get("status"); // open | planned | done | all
    const q = searchParams.get("q")?.trim() ?? "";
    const page = Math.max(parseInt(searchParams.get("page") ?? "1"), 1);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (
      status &&
      status !== "all" &&
      ["open", "planned", "done"].includes(status)
    ) {
      where.status = status;
    }
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { userEmail: { contains: q, mode: "insensitive" } },
      ];
    }

    const [ideas, total] = await Promise.all([
      prisma.lekaoIdea.findMany({
        where,
        orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
        skip,
        take: limit,
        include: {
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.lekaoIdea.count({ where }),
    ]);

    return NextResponse.json({
      ideas: ideas.map((i) => ({
        id: i.id,
        userId: i.userId,
        userEmail: i.userEmail,
        title: i.title,
        description: i.description,
        status: i.status,
        likeCount: i._count.likes,
        commentCount: i._count.comments,
        createdAt: i.createdAt,
      })),
      total,
      page,
      limit,
    });
  } catch (e) {
    console.error("[admin/ideas GET] error:", e);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
