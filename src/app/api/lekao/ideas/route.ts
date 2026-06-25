// ============================================
// Lekao · 灵感墙 API · GET 列表 + POST 提交 (v2.2.0)
// ============================================
// 安全：banned 拦截 + 敏感词 + 每日 1 次 + 重复标题 + 长度校验
// GET 支持：tab (all/mine/liked) + q (搜索) + sort (likes/latest) + limit

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { containsSensitiveWords } from "@/lib/sensitive-words";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 限制常量
const TITLE_MAX = 50;
const DESCRIPTION_MAX = 500;
const LIMIT_MAX = 100;
const LIMIT_DEFAULT = 50;

/**
 * 判定 UTC+8 当日起始（北京时间当天 00:00:00 的 UTC 时间）
 */
function todayStartUtc(): Date {
  const now = new Date();
  // 北京时间 = UTC+8 → 北京当天 00:00 = UTC (前一天的) 16:00
  const beijingMs = now.getTime() + 8 * 3600 * 1000;
  const beijingNow = new Date(beijingMs);
  const startOfDayBeijing = new Date(
    Date.UTC(
      beijingNow.getUTCFullYear(),
      beijingNow.getUTCMonth(),
      beijingNow.getUTCDate(),
    ),
  );
  // 转回 UTC
  return new Date(startOfDayBeijing.getTime() - 8 * 3600 * 1000);
}

// ============================================
// GET · 列表
// ============================================
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const tab = (searchParams.get("tab") ?? "all").toLowerCase();
    const q = (searchParams.get("q") ?? "").trim();
    const sort = (searchParams.get("sort") ?? "likes").toLowerCase();
    const limit = Math.min(
      LIMIT_MAX,
      Math.max(1, parseInt(searchParams.get("limit") ?? String(LIMIT_DEFAULT))),
    );

    // tab=loved → 先取 user 赞过的 idea_id，再 IN 查询
    let scopedIdeaIds: string[] | null = null;
    if (tab === "loved") {
      const liked = await prisma.lekaoIdeaLike.findMany({
        where: { userId },
        select: { ideaId: true },
      });
      scopedIdeaIds = liked.map((l) => l.ideaId);
      if (scopedIdeaIds.length === 0) {
        return NextResponse.json({ ideas: [], total: 0 });
      }
    }

    // 拼 where
    const where: Record<string, unknown> = {};
    if (tab === "mine") where.userId = userId;
    if (scopedIdeaIds) where.id = { in: scopedIdeaIds };
    if (q) {
      // ILIKE 模糊匹配（title 或 description 任一命中）
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    // 主查询：JOIN 点赞数 + 评论数 + 我是否赞过
    const ideas = await prisma.lekaoIdea.findMany({
      where,
      orderBy:
        sort === "latest"
          ? { createdAt: "desc" }
          : [{ createdAt: "desc" }], // 点赞数排序在 SQL 层做（GROUP BY）成本高，量小 OK 时降级到内存排序
      take: limit,
      include: {
        _count: {
          select: {
            likes: true,
            comments: { where: { status: "visible" } },
          },
        },
        likes: {
          where: { userId },
          select: { ideaId: true },
          take: 1,
        },
      },
    });

    // 计算 likeCount + myLiked
    const enriched = ideas.map((i) => ({
      id: i.id,
      userId: i.userId,
      userEmail: i.userEmail,
      title: i.title,
      description: i.description,
      status: i.status,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
      likeCount: i._count.likes,
      commentCount: i._count.comments,
      myLiked: i.likes.length > 0,
      myOwn: i.userId === userId,
    }));

    // 排序：likes → 按 likeCount desc + createdAt desc
    if (sort !== "latest") {
      enriched.sort((a, b) => {
        if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    const total = await prisma.lekaoIdea.count({ where });

    return NextResponse.json({ ideas: enriched, total, limit });
  } catch (e) {
    console.error("[lekao/ideas GET] error:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// ============================================
// POST · 提交
// ============================================
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (session.user.banned === true) {
      return NextResponse.json({ error: "账号已被封禁" }, { status: 403 });
    }
    const userId = session.user.id;
    const userEmail = session.user.email;

    let body: { title?: unknown; description?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";

    if (!title) {
      return NextResponse.json({ error: "标题不能为空" }, { status: 422 });
    }
    if (title.length > TITLE_MAX) {
      return NextResponse.json(
        { error: `标题不能超过 ${TITLE_MAX} 字` },
        { status: 422 },
      );
    }
    if (!description) {
      return NextResponse.json({ error: "描述不能为空" }, { status: 422 });
    }
    if (description.length > DESCRIPTION_MAX) {
      return NextResponse.json(
        { error: `描述不能超过 ${DESCRIPTION_MAX} 字` },
        { status: 422 },
      );
    }

    // 敏感词校验
    if (containsSensitiveWords(title)) {
      return NextResponse.json(
        { error: "标题含敏感词，请修改后重试" },
        { status: 422 },
      );
    }
    if (containsSensitiveWords(description)) {
      return NextResponse.json(
        { error: "描述含敏感词，请修改后重试" },
        { status: 422 },
      );
    }

    // 每日 1 次：北京时间当天
    const todayStart = todayStartUtc();
    const todayCount = await prisma.lekaoIdea.count({
      where: { userId, createdAt: { gte: todayStart } },
    });
    if (todayCount > 0) {
      return NextResponse.json(
        { error: "今天已经提过啦，明天再来 💡" },
        { status: 429 },
      );
    }

    // 同日重复标题检测
    const dupTitle = await prisma.lekaoIdea.findFirst({
      where: {
        userId,
        title: { equals: title, mode: "insensitive" },
        createdAt: { gte: todayStart },
      },
    });
    if (dupTitle) {
      return NextResponse.json(
        { error: "今天已经提过相同标题了" },
        { status: 429 },
      );
    }

    const created = await prisma.lekaoIdea.create({
      data: { userId, userEmail, title, description },
      select: {
        id: true,
        userId: true,
        userEmail: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ idea: created });
  } catch (e) {
    console.error("[lekao/ideas POST] error:", e);
    return NextResponse.json({ error: "提交失败" }, { status: 500 });
  }
}