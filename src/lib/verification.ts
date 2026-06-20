import { prisma } from "./prisma";
import type { EmailPurpose } from "./email";

const CODE_LENGTH = 6;
const EXPIRES_MINUTES = 10;
const SEND_COOLDOWN_SECONDS = 60;

/**
 * 生成 6 位数字验证码
 * 范围: 000000 - 999999 (前导 0 保留)
 */
export function generateCode(): string {
  return Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(CODE_LENGTH, "0");
}

/**
 * 限频检查: 同一邮箱 60s 内只能发一次
 */
export async function canSendCode(
  email: string,
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const last = await prisma.verificationCode.findFirst({
    where: { email, used: false },
    orderBy: { createdAt: "desc" },
  });

  if (!last) return { ok: true };

  const elapsed = Math.floor(
    (Date.now() - last.createdAt.getTime()) / 1000,
  );

  if (elapsed < SEND_COOLDOWN_SECONDS) {
    return { ok: false, retryAfter: SEND_COOLDOWN_SECONDS - elapsed };
  }

  return { ok: true };
}

/**
 * 创建新验证码 + 标记同邮箱同 purpose 的旧验证码为已用 (防多次使用)
 */
export async function createVerificationCode(
  email: string,
  purpose: EmailPurpose,
): Promise<string> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + EXPIRES_MINUTES * 60 * 1000);

  await prisma.verificationCode.updateMany({
    where: { email, purpose, used: false },
    data: { used: true },
  });

  await prisma.verificationCode.create({
    data: { email, code, purpose, expiresAt },
  });

  return code;
}

/**
 * 验证验证码 (找到 + 未过期 + 标记为已用)
 */
export async function verifyCode(
  email: string,
  code: string,
  purpose: EmailPurpose,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const record = await prisma.verificationCode.findFirst({
    where: { email, code, purpose, used: false },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { ok: false, reason: "验证码错误或已被使用" };
  }

  if (record.expiresAt < new Date()) {
    return { ok: false, reason: "验证码已失效，请重新获取" };
  }

  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { used: true },
  });

  return { ok: true };
}