import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { EmailPurpose } from "./email";

const CODE_LENGTH = 6;
const EXPIRES_MINUTES = 10;
const SEND_COOLDOWN_SECONDS = 60;
const BCRYPT_COST = 10;
const MAX_ATTEMPTS = 5; // 5 次错码后锁定 1 小时
const LOCKOUT_MINUTES = 60;

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
 * ⭐ v0.5+: code 改用 bcrypt 哈希存 codeHash, 不再存明文 (防 DB 泄露)
 */
export async function createVerificationCode(
  email: string,
  purpose: EmailPurpose,
): Promise<string> {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, BCRYPT_COST);
  const expiresAt = new Date(Date.now() + EXPIRES_MINUTES * 60 * 1000);

  await prisma.verificationCode.updateMany({
    where: { email, purpose, used: false },
    data: { used: true },
  });

  await prisma.verificationCode.create({
    data: {
      email,
      codeHash, // 只存哈希, code 字段不写
      purpose,
      expiresAt,
      attempts: 0,
    },
  });

  return code;
}

/**
 * 验证验证码 (找到 + bcrypt 比对 + 未过期 + 标记为已用 + 失败计数)
 * ⭐ v0.5+: 用 bcrypt.compare 哈希比对, 不再明文比对
 * ⭐ 防暴力: 连续 5 次错码后锁定 1 小时
 */
export async function verifyCode(
  email: string,
  code: string,
  purpose: EmailPurpose,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const record = await prisma.verificationCode.findFirst({
    where: { email, purpose, used: false },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { ok: false, reason: "验证码错误或已被使用" };
  }

  if (record.expiresAt < new Date()) {
    return { ok: false, reason: "验证码已失效，请重新获取" };
  }

  // 防暴力: 锁定检查 (attempts >= MAX + 未过期 锁定 1 小时)
  if (record.attempts >= MAX_ATTEMPTS) {
    const lockExpiry = new Date(
      record.expiresAt.getTime() - LOCKOUT_MINUTES * 60 * 1000,
    );
    if (lockExpiry > new Date()) {
      return {
        ok: false,
        reason: `验证码已被锁定，请重新获取`,
      };
    }
  }

  // ⭐ bcrypt 比对 (codeHash 优先, 老 code 字段 fallback 兼容)
  let matched = false;
  if (record.codeHash) {
    matched = await bcrypt.compare(code, record.codeHash);
  } else if (record.code) {
    // 兼容老数据 (明文 code)
    matched = record.code === code;
  }

  if (!matched) {
    // 失败计数 +1
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "验证码错误" };
  }

  // 成功 → 标记为已用
  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { used: true },
  });

  return { ok: true };
}
