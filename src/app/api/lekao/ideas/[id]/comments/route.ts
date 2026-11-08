// ============================================
// Lekao · 灵感评论 API · GET 列表 + POST 提交 (v2.2.0)
// ============================================
// 决策 #10：每用户对每个灵感最多 1 条 active 评论
// 用 partial unique index 强制；删了 = status='banned' 永久禁该位

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { containsSensitiveWords } from "@/lib/sensitive-words";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_MAX = 200;

// ============================================
// GET · 评论列表（按时间正序，仅 visible）
// ============================================
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    const { id } = await params;

    const comments = await prisma.lekaoIdeaComment.findMany({
      where: { ideaId: id, status: "visible" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        ideaId: true,
        userId: true,
        userEmail: true,
        content: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      comments: comments.map((c) => ({
        ...c,
        myOwn: c.userId === session.user.id,
      })),
    });
  } catch (e) {
    console.error("[lekao/ideas/[id]/comments GET] error:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// ============================================
// POST · 提交评论
// ============================================
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const { id: ideaId } = await params;

    let body: { content?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "请求体不是合法 JSON" },
        { status: 400 },
      );
    }

    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json({ error: "评论不能为空" }, { status: 422 });
    }
    if (content.length > CONTENT_MAX) {
      return NextResponse.json(
        { error: `评论不能超过 ${CONTENT_MAX} 字` },
        { status: 422 },
      );
    }
    if (containsSensitiveWords(content)) {
      return NextResponse.json(
        { error: "评论含敏感词，请修改后重试" },
        { status: 422 },
      );
    }

    // 校验灵感存在
    const idea = await prisma.lekaoIdea.findUnique({
      where: { id: ideaId },
      select: { id: true },
    });
    if (!idea) {
      return NextResponse.json({ error: "灵感不存在" }, { status: 404 });
    }

    // 检查是否已有 visible 评论（含 banned 历史）
    const existingVisible = await prisma.lekaoIdeaComment.findFirst({
      where: { ideaId, userId, status: "visible" },
    });
    if (existingVisible) {
      return NextResponse.json({ error: "你已经评论过了" }, { status: 429 });
    }

    const existingBanned = await prisma.lekaoIdeaComment.findFirst({
      where: { ideaId, userId, status: "banned" },
    });
    if (existingBanned) {
      // 决策 #10：删了 = 永久禁
      return NextResponse.json(
        { error: "评论已撤回，无法再次评论" },
        { status: 429 },
      );
    }

    // INSERT（partial unique index 兜底，防止并发 race）
    try {
      const created = await prisma.lekaoIdeaComment.create({
        data: {
          ideaId,
          userId,
          userEmail,
          content,
          status: "visible",
        },
        select: {
          id: true,
          ideaId: true,
          userId: true,
          userEmail: true,
          content: true,
          createdAt: true,
        },
      });
      return NextResponse.json({ comment: { ...created, myOwn: true } });
    } catch (e: unknown) {
      // 兜底：partial unique index 触发（race condition）
      const err = e as { code?: string };
      if (err?.code === "P2002") {
        return NextResponse.json({ error: "你已经评论过了" }, { status: 429 });
      }
      throw e;
    }
  } catch (e) {
    console.error("[lekao/ideas/[id]/comments POST] error:", e);
    return NextResponse.json({ error: "提交失败" }, { status: 500 });
  }
}
