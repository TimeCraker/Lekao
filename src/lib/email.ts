import nodemailer from "nodemailer";
import { renderVerificationCodeEmail } from "./email-templates";

// ⭐ Nodemailer 单例 transport (QQ 邮箱 SMTP, 端口 465 SSL)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const PURPOSE_TEXT: Record<string, string> = {
  register: "注册",
  login: "登录",
  reset: "重置密码",
};

export type EmailPurpose = "register" | "login" | "reset";

export async function sendVerificationCodeEmail(opts: {
  to: string;
  code: string;
  purpose: EmailPurpose;
}): Promise<void> {
  const expiresInMinutes = 10;

  const html = renderVerificationCodeEmail({
    code: opts.code,
    purpose: opts.purpose,
    expiresInMinutes,
  });

  const text =
    `您的 Lekao 验证码: ${opts.code}\n\n` +
    `用于${PURPOSE_TEXT[opts.purpose]}操作，${expiresInMinutes} 分钟内有效。\n\n` +
    `如果这不是您本人的操作，请忽略此邮件。`;

  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? "Lekao"}" <${process.env.SMTP_FROM_EMAIL}>`,
    to: opts.to,
    subject: `【Lekao】您的验证码 · ${PURPOSE_TEXT[opts.purpose]}`,
    html,
    text,
  });
}