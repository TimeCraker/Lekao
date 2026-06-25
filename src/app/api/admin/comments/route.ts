// ============================================
// Lekao · Admin 评论管理列表 API (v2.2.0 #2)
// ============================================
// GET 评论列表（按灵感过滤 + 状态过滤 + 搜索 + 分页）

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
    const ideaId = searchParams.get("ideaId");
    const status = searchParams.get("status"); // visible | banned | all
    const q = searchParams.get("q")?.trim() ?? "";
    const page = Math.max(parseInt(searchParams.get("page") ?? "1"), 1);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "30"), 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (ideaId) where.ideaId = ideaId;
    if (status && status !== "all" && ["visible", "banned"].includes(status)) {
      where.status = status;
    }
    if (q) {
      where.OR = [
        { content: { contains: q, mode: "insensitive" } },
        { userEmail: { contains: q, mode: "insensitive" } },
      ];
    }

    const [comments, total] = await Promise.all([
      prisma.lekaoIdeaComment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          idea: { select: { id: true, title: true } },
        },
      }),
      prisma.lekaoIdeaComment.count({ where }),
    ]);

    return NextResponse.json({
      comments: comments.map((c) => ({
        id: c.id,
        ideaId: c.ideaId,
        ideaTitle: c.idea.title,
        userEmail: c.userEmail,
        content: c.content,
        status: c.status,
        createdAt: c.createdAt,
      })),
      total,
      page,
      limit,
    });
  } catch (e) {
    console.error("[admin/comments GET] error:", e);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}