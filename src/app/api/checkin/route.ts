import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { errorResponse } from "@/lib/error-envelope";
import {
  AWARD_BY_DAY,
  REASON_PREFIX,
  dayKeyOf,
  calcStreakDay,
} from "@/lib/checkin";

/**
 * S01 T-006 · 每日签到（Asia/Shanghai 自然日幂等）
 *
 * 幂等保证：
 * - 先查同日记录给友好提示；DB 唯一索引 (userId, dayKey) 兜底
 * - 并发重复请求：唯一冲突 → 读回既有记录返回 alreadyCheckedIn（不再 500）
 * - 余额写入不再「读后写绝对值」：未初始化(-1) 置为 award，否则原子 increment，
 *   避免与并发的 AI 扣费/退款相互覆盖（旧实现会把并发扣掉的币写回去）
 */
export async function POST() {
  const correlationId = `lekao-checkin-${randomUUID()}`;
  const todayKey = dayKeyOf();
  let userId: string | null = null;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse(401, {
        message: "请先登录",
        code: "UNAUTHENTICATED",
        correlationId,
      });
    }
    userId = session.user.id;

    const yesterdayKey = dayKeyOf(new Date(Date.now() - 86_400_000));

    // 1. 防同日重复签到（DB unique 兜底，这里先查给友好提示）
    const already = await prisma.lekaoCheckin.findUnique({
      where: { userId_dayKey: { userId, dayKey: todayKey } },
      select: { streakDay: true, award: true },
    });
    if (already) return alreadyResponse(already, todayKey);

    // 2. 查最近一次签到算 streak
    const last = await prisma.lekaoCheckin.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { dayKey: true, streakDay: true },
    });
    const streakDay = calcStreakDay(
      last?.dayKey ?? null,
      last?.streakDay ?? null,
      yesterdayKey,
    );
    const award = AWARD_BY_DAY[streakDay] ?? 2;

    // 3. 事务：签到记录 + 加币 + 流水
    const settled = await prisma.$transaction(async (tx) => {
      await tx.lekaoCheckin.create({
        data: { userId: userId!, dayKey: todayKey, streakDay, award },
      });

      // 未初始化（-1）→ 置为 award；否则原子 increment（绝不写绝对值）
      const initialized = await tx.user.updateMany({
        where: { id: userId!, lekao_gift_coin: { lt: 0 } },
        data: { lekao_gift_coin: award },
      });
      if (initialized.count === 0) {
        const bumped = await tx.user.updateMany({
          where: { id: userId! },
          data: { lekao_gift_coin: { increment: award } },
        });
        if (bumped.count === 0) throw new Error("USER_NOT_FOUND");
      }

      const user = await tx.user.findUnique({
        where: { id: userId! },
        select: { lekao_gift_coin: true, t_coin: true },
      });
      if (!user) throw new Error("USER_NOT_FOUND");

      await tx.lekaoCoinLog.create({
        data: {
          userId: userId!,
          adminId: userId!, // 用户自助签到，adminId 挂自己（可追溯）
          amount: award,
          beforeGift: user.lekao_gift_coin - award,
          beforePaid: user.t_coin,
          afterGift: user.lekao_gift_coin,
          afterPaid: user.t_coin,
          reason: `${REASON_PREFIX}${streakDay}天`,
        },
      });

      return { afterGift: user.lekao_gift_coin, paid: user.t_coin };
    });

    return NextResponse.json({
      ok: true,
      award,
      streakDay,
      dayKey: todayKey,
      newGift: settled.afterGift,
      newTotal: settled.afterGift + settled.paid,
      correlationId,
    });
  } catch (e) {
    // 并发同一天：唯一索引拦下后读回既有记录，等价于幂等重放
    if (userId && isUniqueViolation(e)) {
      const existing = await prisma.lekaoCheckin.findUnique({
        where: { userId_dayKey: { userId, dayKey: todayKey } },
        select: { streakDay: true, award: true },
      });
      if (existing) return alreadyResponse(existing, todayKey);
    }
    if (e instanceof Error && e.message === "USER_NOT_FOUND") {
      return errorResponse(404, {
        message: "用户不存在",
        code: "NOT_FOUND",
        correlationId,
      });
    }
    console.error("[api/checkin] error:", e);
    return errorResponse(500, {
      message: "签到失败，请稍后重试",
      code: "INTERNAL",
      correlationId,
    });
  }
}

function alreadyResponse(
  record: { streakDay: number; award: number },
  dayKey: string,
) {
  return NextResponse.json({
    ok: false,
    alreadyCheckedIn: true,
    streakDay: record.streakDay,
    award: record.award,
    dayKey,
  });
}

/** Prisma 唯一约束冲突（鸭子类型，便于单测构造） */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "P2002"
  );
}
