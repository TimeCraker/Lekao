import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const [
      totalUsers,
      totalSummaries,
      totalFeedbacks,
      totalInviteCodes,
      usedInviteCodes,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.lekaoClassSummary.count(),
      prisma.lekaoClassFeedback.count(),
      prisma.invitationCode.count(),
      prisma.invitationCode.count({ where: { used: true } }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          lekao_gift_coin: true,
          t_coin: true,
          createdAt: true,
        },
      }),
    ]);

    // Latest 7 days signup trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSignups = await prisma.user.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const dailySignups: Record<string, number> = {};
    for (const u of recentSignups) {
      const day = u.createdAt.toISOString().slice(0, 10);
      dailySignups[day] = (dailySignups[day] ?? 0) + 1;
    }

    // Total coin spent on summaries + feedbacks
    const summaryCoin = await prisma.lekaoClassSummary.aggregate({
      _sum: { tCoinUsed: true },
    });
    const feedbackCoin = await prisma.lekaoClassFeedback.aggregate({
      _sum: { tCoinUsed: true },
    });
    const totalCoinSpent =
      (summaryCoin._sum.tCoinUsed ?? 0) + (feedbackCoin._sum.tCoinUsed ?? 0);

    return NextResponse.json({
      totalUsers,
      totalSummaries,
      totalFeedbacks,
      totalInviteCodes,
      usedInviteCodes,
      totalCoinSpent,
      recentUsers,
      dailySignups: Object.entries(dailySignups).map(([date, count]) => ({
        date,
        count,
      })),
    });
  } catch (e) {
    console.error("[admin/stats] error:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
