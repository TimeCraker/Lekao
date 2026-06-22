import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canSendCode, createVerificationCode } from "@/lib/verification";
import { sendVerificationCodeEmail, type EmailPurpose } from "@/lib/email";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_PURPOSES: EmailPurpose[] = ["register", "login", "reset"];

// ============================================
// ⭐ IP 级限频（2026-06-22 · 防刷验证码）
// 防止恶意注册/刷验证码攻击: DB + QQ SMTP 不被打爆
// 单实例 in-memory 够用（lekao 单进程），多实例时再换 Redis
// 规则：
//   - 60s 内同 IP 最多 1 次（防暴力单击）
//   - 1 分钟滑动窗口内同 IP 最多 5 次（防持续刷）
// ============================================
const IP_COOLDOWN_MS = 60 * 1000;
const IP_WINDOW_MS = 60 * 1000;
const IP_WINDOW_MAX = 5;
const ipRateStore = new Map<string, number[]>();

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    // 取第一段（最原始的客户端 IP，nginx 配置 proxy_add_x_forwarded_for 才有）
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

function checkIpRateLimit(ip: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const timestamps = (ipRateStore.get(ip) || []).filter(
    (t) => now - t < IP_WINDOW_MS,
  );

  // 60s 内已发过 → 拒绝
  if (timestamps.length > 0) {
    const latest = Math.max(...timestamps);
    const since = now - latest;
    if (since < IP_COOLDOWN_MS) {
      return { ok: false, retryAfter: Math.ceil((IP_COOLDOWN_MS - since) / 1000) };
    }
  }

  // 窗口内超 5 次 → 拒绝
  if (timestamps.length >= IP_WINDOW_MAX) {
    const oldest = Math.min(...timestamps);
    return { ok: false, retryAfter: Math.ceil((oldest + IP_WINDOW_MS - now) / 1000) };
  }

  timestamps.push(now);
  ipRateStore.set(ip, timestamps);
  return { ok: true };
}

export async function POST(req: Request) {
  try {
    // 0. ⭐ IP 级限频（最先做, 越早 reject 越省 DB/SMTP）
    const ip = getClientIp(req);
    const ipCheck = checkIpRateLimit(ip);
    if (!ipCheck.ok) {
      console.warn(`[send-code] IP 限频: ${ip} retryAfter=${ipCheck.retryAfter}s`);
      return NextResponse.json(
        { error: `请求过于频繁，请 ${ipCheck.retryAfter} 秒后再试` },
        {
          status: 429,
          headers: { "Retry-After": String(ipCheck.retryAfter) },
        },
      );
    }

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

    // 4. 限频检查 (60s 一次, 按邮箱)
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