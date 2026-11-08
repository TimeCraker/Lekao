import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyCode } from "@/lib/verification";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_ROUNDS = 10;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, code } = body as {
      email?: string;
      password?: string;
      name?: string;
      code?: string;
    };

    // 1. 参数校验
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "邮箱格式错误" }, { status: 400 });
    }
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `密码至少 ${MIN_PASSWORD_LENGTH} 位` },
        { status: 400 },
      );
    }
    if (!code || code.length !== 6) {
      return NextResponse.json({ error: "请输入 6 位验证码" }, { status: 400 });
    }

    // 2. 校验验证码 (PRD §3.5.3 注册流程第一步)
    const verified = await verifyCode(email, code, "register");
    if (!verified.ok) {
      return NextResponse.json({ error: verified.reason }, { status: 400 });
    }

    // 3. 邮箱已被注册 (并发场景)
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "该邮箱已注册" }, { status: 400 });
    }

    // 4. 写 users 表
    // ⭐ lekao_gift_coin 不指定 → schema 默认 -1 (PRD §3.5.3 关键修正)
    //    赠币由 signIn callback 延迟初始化, 不在这里给
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name?.trim() || email.split("@")[0],
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        lekao_gift_coin: true,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "注册成功",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (e) {
    console.error("[register] 异常:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
