import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { verifyCode } from "@/lib/verification";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, code, inviteCode } = body as {
      email?: string;
      code?: string;
      inviteCode?: string;
    };

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
        banned: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // ⭐ P0#3 封禁拦截 — banned=true 拒绝登录 (验证码旁路)
    if (user.banned) {
      console.warn(`[verify-code] banned 登录被拒: ${email}`);
      return NextResponse.json(
        { error: "账号已被封禁，请联系客服" },
        { status: 403 },
      );
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

    // 4. ⭐ 邀请码兑换 (事务内原子操作, 防竞态双兑)
    if (inviteCode && inviteCode.trim()) {
      const trimmedCode = inviteCode.trim().toUpperCase();

      await prisma.$transaction(async (tx) => {
        // 4a. 用户级别防护: 已兑换过则静默跳过
        const already = await tx.invitationCode.findFirst({
          where: { usedByUserId: user.id },
        });
        if (already) return;

        // 4b. 原子 claim: updateMany + used:false 条件, 并发下仅一个成功
        const claim = await tx.invitationCode.updateMany({
          where: { code: trimmedCode, used: false },
          data: { used: true, usedByUserId: user.id, usedAt: new Date() },
        });
        if (claim.count === 0) return; // 码不存在或已被他人兑走

        // 4c. 加 15 枚赠送币
        await tx.user.update({
          where: { id: user.id },
          data: { lekao_gift_coin: { increment: 15 } },
        });
        user.lekao_gift_coin += 15;
        console.log(
          `[verify-code] 邀请码兑换: user ${email} code=${trimmedCode} +15 T-Coin`,
        );
      });
    }

    // 5. 颁发 next-auth JWT cookie
    // ⭐ cookie 名必须与 next-auth v4 useSecureCookies 一致
    //    生产环境 (HTTPS) 用 __Secure-next-auth.session-token
    const useSecureCookies =
      process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
    const cookiePrefix = useSecureCookies ? "__Secure-" : "";

    const token = await encode({
      token: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        lekao_gift_coin: user.lekao_gift_coin,
        t_coin: user.t_coin,
        banned: user.banned,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: 30 * 24 * 60 * 60,
    });

    (await cookies()).set({
      name: `${cookiePrefix}next-auth.session-token`,
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