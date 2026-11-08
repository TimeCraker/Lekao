"use client";

import { useState, useTransition, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { PressableButton } from "@/components/ui/pressable-button";
import { useShake } from "@/lib/hooks/motion";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isPending, startTransition] = useTransition();
  const { shakeKey, triggerShake } = useShake();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendCode = async () => {
    setError("");
    setMessage("");
    if (!email) {
      setError("请先填写邮箱");
      return;
    }
    if (!agree) {
      setError("请先勾选同意服务条款");
      triggerShake();
      return;
    }
    const res = await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, purpose: "register" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "发送失败");
      triggerShake();
      return;
    }
    setMessage("验证码已发送，请查收邮件");
    setCooldown(60);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    // 1. 前端校验
    if (password !== confirmPassword) {
      setError("两次密码不一致");
      triggerShake();
      return;
    }
    if (password.length < 8) {
      setError("密码至少 8 位");
      triggerShake();
      return;
    }
    if (!agree) {
      setError("请勾选同意服务条款");
      triggerShake();
      return;
    }

    startTransition(async () => {
      // 2. 调注册 API
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "注册失败");
        triggerShake();
        return;
      }

      // 3. 自动登录 (signIn callback 会检测 lekaoGiftCoin === -1 补发 5 枚)
      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (signInRes?.error || !signInRes?.ok) {
        setError("注册成功，但自动登录失败，请手动登录");
        setTimeout(() => router.push("/login"), 1500);
        return;
      }
      // 标记已注册（让"免费开始"按钮后续默认跳登录页）
      localStorage.setItem("lekao-account-exists", "true");
      router.push("/dashboard");
      router.refresh();
    });
  };

  return (
    <main className="relative min-h-screen bg-canvas flex items-center justify-center px-4 py-12 overflow-hidden">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-accent-text text-white flex items-center justify-center text-xl font-bold font-serif">
            L
          </div>
          <span className="font-serif text-xl font-semibold text-ink">
            Lekao Agent
          </span>
        </Link>

        {/* Card */}
        <div className="bg-paper rounded-2xl shadow-sm p-8 border border-hairline">
          <div className="flex items-center gap-3 mb-5">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-text">
              注册
            </span>
            <span className="h-px flex-1 bg-hairline" />
          </div>
          <h1 className="font-serif text-3xl font-semibold text-ink mb-2">
            创建 Lekao Agent 工作台
          </h1>
          <p className="font-serif italic text-sm text-ink-muted mb-6">
            注册后就能用错题本、课堂小结，新账号送 T-Coin。
          </p>

          <motion.form
            key={shakeKey}
            onSubmit={handleSubmit}
            className={`space-y-4 ${error ? "anim-shake" : ""}`}
          >
            <div className="group">
              <label
                htmlFor="reg-email"
                className="block text-sm font-medium text-ink mb-2 transition-colors group-focus-within:text-accent-text"
              >
                邮箱
              </label>
              <input
                id="reg-email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 border border-hairline rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
              />
            </div>

            <div className="group">
              <label
                htmlFor="reg-name"
                className="block text-sm font-medium text-ink mb-2 transition-colors group-focus-within:text-accent-text"
              >
                用户名（可选）
              </label>
              <input
                id="reg-name"
                type="text"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="你的称呼"
                className="w-full px-4 py-2.5 border border-hairline rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
              />
            </div>

            <div className="group">
              <label
                htmlFor="reg-password"
                className="block text-sm font-medium text-ink mb-2 transition-colors group-focus-within:text-accent-text"
              >
                密码（至少 8 位）
              </label>
              <input
                id="reg-password"
                type="password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={8}
                className="w-full px-4 py-2.5 border border-hairline rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
              />
            </div>

            <div className="group">
              <label
                htmlFor="reg-confirm"
                className="block text-sm font-medium text-ink mb-2 transition-colors group-focus-within:text-accent-text"
              >
                确认密码
              </label>
              <input
                id="reg-confirm"
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="再次输入密码"
                minLength={8}
                className="w-full px-4 py-2.5 border border-hairline rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
              />
            </div>

            <div className="group">
              <label
                htmlFor="reg-code"
                className="block text-sm font-medium text-ink mb-2 transition-colors group-focus-within:text-accent-text"
              >
                邮箱验证码
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="reg-code"
                  type="text"
                  name="code"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  placeholder="6 位数字"
                  inputMode="numeric"
                  className="min-w-0 flex-1 basis-40 px-4 py-2.5 border border-hairline rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition font-mono text-lg tracking-widest text-center"
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={cooldown > 0 || !agree}
                  title={!agree ? "请先勾选同意服务条款" : undefined}
                  className="max-sm:w-full sm:px-4 py-2.5 min-h-11 bg-canvas-alt text-ink-mute rounded-lg text-sm font-medium hover:bg-hairline transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {cooldown > 0 ? `${cooldown}s` : "发送验证码"}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-hairline text-accent focus:ring-2 focus:ring-accent/20"
              />
              <span className="text-sm text-ink-muted">
                我已阅读并同意{" "}
                <Link
                  href="/terms"
                  className="text-accent-text underline decoration-accent-text/40 underline-offset-2 hover:text-accent-hover hover:decoration-accent-text py-1 -my-1 inline-block"
                >
                  服务条款
                </Link>{" "}
                和{" "}
                <Link
                  href="/privacy"
                  className="text-accent-text underline decoration-accent-text/40 underline-offset-2 hover:text-accent-hover hover:decoration-accent-text py-1 -my-1 inline-block"
                >
                  隐私政策
                </Link>
              </span>
            </label>

            {error && (
              <div
                role="alert"
                className="text-sm text-danger-text bg-danger/5 px-3 py-2 rounded-lg"
              >
                {error}
              </div>
            )}
            {message && (
              <div className="text-sm text-success-text bg-success/5 px-3 py-2 rounded-lg">
                {message}
              </div>
            )}

            <PressableButton
              type="submit"
              loading={isPending}
              className="w-full min-h-11"
            >
              {isPending ? "注册中..." : "创建账号"}
            </PressableButton>
          </motion.form>

          <div className="mt-6 text-center text-sm text-ink-muted">
            已有账号？
            <Link
              href="/login"
              className="inline-block py-1 text-accent-text font-medium hover:text-accent-hover ml-1"
            >
              立即登录
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
