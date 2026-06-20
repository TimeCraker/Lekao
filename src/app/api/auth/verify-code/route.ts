import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { verifyCode } from "@/lib/verification";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, code } = body as { email?: string; code?: string };

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "邮箱格式错误" }, { status: 400 });
    }
    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: "请输入 6 位验证码" },
        { status: 400 },
      );
    }

    // 1. 校验验证码
    const verified = await verifyCode(email, code, "login");
    if (!verified.ok) {
      return NextResponse.json({ error: verified.reason }, { status: 400 });
    }

    // 2. 查 user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        lekao_gift_coin: true,
        t_coin: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 3. ⭐ 延迟初始化赠币 (PRD §3.4.1.2)
    if (user.lekao_gift_coin === -1) {
      await prisma.user.update({
        where: { id: user.id },
        data: { lekao_gift_coin: 5 },
      });
      user.lekao_gift_coin = 5;
      console.log(`[verify-code] 延迟初始化赠币: user ${email} +5 T-Coin`);
    }

    // 4. 颁发 next-auth JWT cookie
    const token = await encode({
      token: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        lekao_gift_coin: user.lekao_gift_coin,
        t_coin: user.t_coin,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: 30 * 24 * 60 * 60,
    });

    (await cookies()).set({
      name: "next-auth.session-token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });

    return NextResponse.json({
      ok: true,
      message: "登录成功",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (e) {
    console.error("[verify-code] 异常:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}