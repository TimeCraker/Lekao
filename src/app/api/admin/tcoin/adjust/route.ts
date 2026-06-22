import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const { userId, amount, reason } = await req.json();

    if (!userId || typeof amount !== "number") {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }

    // 先扣赠送币，再扣充值币
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lekao_gift_coin: true, t_coin: true },
    });
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    let newGift = user.lekao_gift_coin;
    let newPaid = user.t_coin;

    if (amount > 0) {
      // 增加：先加到赠送币
      newGift += amount;
    } else {
      // 扣除：先扣赠送币
      const deduct = Math.abs(amount);
      const giftDeduct = Math.min(newGift, deduct);
      newGift -= giftDeduct;
      const paidDeduct = deduct - giftDeduct;
      if (paidDeduct > newPaid) {
        return NextResponse.json({ error: "余额不足" }, { status: 400 });
      }
      newPaid -= paidDeduct;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { lekao_gift_coin: newGift, t_coin: newPaid },
    });

    console.log(
      `[admin/tcoin] adjust: user=${userId} amount=${amount} reason=${reason ?? ""}`,
    );

    return NextResponse.json({
      balance: newGift + newPaid,
      lekao_gift_coin: newGift,
      t_coin: newPaid,
    });
  } catch (e) {
    console.error("[admin/tcoin/adjust] error:", e);
    return NextResponse.json({ error: "调整失败" }, { status: 500 });
  }
}
