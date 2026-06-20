import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canSendCode, createVerificationCode } from "@/lib/verification";
import { sendVerificationCodeEmail, type EmailPurpose } from "@/lib/email";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_PURPOSES: EmailPurpose[] = ["register", "login", "reset"];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, purpose } = body as {
      email?: string;
      purpose?: EmailPurpose;
    };

    // 1. 参数校验
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "邮箱格式错误" }, { status: 400 });
    }
    if (!purpose || !VALID_PURPOSES.includes(purpose)) {
      return NextResponse.json({ error: "purpose 参数错误" }, { status: 400 });
    }

    // 2. 注册场景: 邮箱已注册 → 不发 (防骚扰)
    if (purpose === "register") {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) {
        return NextResponse.json(
          { error: "该邮箱已注册，请直接登录" },
          { status: 400 },
        );
      }
    }

    // 3. 登录场景: 邮箱不存在 → 不发 (防枚举)
    if (purpose === "login") {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (!exists) {
        return NextResponse.json(
          { error: "该邮箱未注册" },
          { status: 400 },
        );
      }
    }

    // 4. 限频检查 (60s 一次)
    const cooldown = await canSendCode(email);
    if (!cooldown.ok) {
      return NextResponse.json(
        { error: `请 ${cooldown.retryAfter} 秒后再试` },
        { status: 429 },
      );
    }

    // 5. 生成验证码 + 写库
    const code = await createVerificationCode(email, purpose);

    // 6. 发送邮件 (失败不要泄露 code, 报通用错误)
    try {
      await sendVerificationCodeEmail({ to: email, code, purpose });
    } catch (e) {
      console.error("[send-code] 邮件发送失败:", e);
      return NextResponse.json(
        { error: "邮件发送失败，请稍后重试" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "验证码已发送，请查收邮件",
    });
  } catch (e) {
    console.error("[send-code] 异常:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}