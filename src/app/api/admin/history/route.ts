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
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
    const type = searchParams.get("type") ?? "all"; // summary | feedback | all
    const userId = searchParams.get("userId") ?? "";

    const whereUserId = userId ? { userId } : {};

    const [summaries, feedbacks, summaryTotal, feedbackTotal] = await Promise.all([
      type === "feedback"
        ? Promise.resolve([])
        : prisma.lekaoClassSummary.findMany({
            where: whereUserId,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            include: {
              user: { select: { email: true, name: true } },
            },
          }),
      type === "summary"
        ? Promise.resolve([])
        : prisma.lekaoClassFeedback.findMany({
            where: whereUserId,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            include: {
              user: { select: { email: true, name: true } },
            },
          }),
      type === "feedback" ? Promise.resolve(0) : prisma.lekaoClassSummary.count({ where: whereUserId }),
      type === "summary" ? Promise.resolve(0) : prisma.lekaoClassFeedback.count({ where: whereUserId }),
    ]);

    return NextResponse.json({
      summaries,
      feedbacks,
      summaryTotal,
      feedbackTotal,
      page,
      limit,
    });
  } catch (e) {
    console.error("[admin/history] error:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
