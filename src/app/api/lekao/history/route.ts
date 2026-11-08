// ============================================
// Lekao · 云端生成历史 API（用户侧 · 只读）
// ============================================
// GET /api/lekao/history?page=1&limit=20&type=all
//
// 只读 lekao_class_summaries / lekao_class_feedbacks 两张已有文本表，
// 返回本人记录（session userId 隔离，不接受外部 userId 参数）。
// 查询逻辑抄改自 src/app/api/admin/history/route.ts（去 admin 校验、去 include user）。
// ⭐ 零 migration · 无删除能力（云端只读，本地记录删除走 IndexedDB）
//

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") ?? "20")),
    );
    const type = searchParams.get("type") ?? "all"; // summary | feedback | all

    // ⭐ where 钉死本人（与 admin 版的关键差异：不接受外部 userId）
    const where = { userId };

    const [summaries, feedbacks, summaryTotal, feedbackTotal] =
      await Promise.all([
        type === "feedback"
          ? Promise.resolve([])
          : prisma.lekaoClassSummary.findMany({
              where,
              orderBy: { createdAt: "desc" },
              skip: (page - 1) * limit,
              take: limit,
              select: {
                id: true,
                subject: true,
                topic: true,
                feedbackText: true,
                summaryText: true,
                createdAt: true,
              },
            }),
        type === "summary"
          ? Promise.resolve([])
          : prisma.lekaoClassFeedback.findMany({
              where,
              orderBy: { createdAt: "desc" },
              skip: (page - 1) * limit,
              take: limit,
              select: {
                id: true,
                subject: true,
                topic: true,
                feedbackText: true,
                description: true,
                createdAt: true,
              },
            }),
        type === "feedback"
          ? Promise.resolve(0)
          : prisma.lekaoClassSummary.count({ where }),
        type === "summary"
          ? Promise.resolve(0)
          : prisma.lekaoClassFeedback.count({ where }),
      ]);

    // 映射为与本地 HistoryRecord 同构（前端零转换合并展示）
    const cloudSummaries = summaries.map((s) => ({
      id: s.id,
      template: "summary" as const,
      subject: s.subject,
      topic: s.topic,
      feedback: s.feedbackText,
      summary: s.summaryText,
      createdAt: s.createdAt.toISOString(),
    }));
    const cloudFeedbacks = feedbacks.map((f) => ({
      id: f.id,
      template: "feedback" as const,
      subject: f.subject,
      topic: f.topic,
      feedback: f.feedbackText,
      summary: f.description ?? "",
      createdAt: f.createdAt.toISOString(),
    }));

    return NextResponse.json({
      summaries: cloudSummaries,
      feedbacks: cloudFeedbacks,
      summaryTotal,
      feedbackTotal,
      page,
      limit,
    });
  } catch (e) {
    console.error("[lekao/history] error:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
