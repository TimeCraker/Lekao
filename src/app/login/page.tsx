"use client";

import { useState, useTransition, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { PressableButton } from "@/components/ui/pressable-button";
import { useShake } from "@/lib/hooks/motion";

type Mode = "password" | "code";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isPending, startTransition] = useTransition();
  const { shakeKey, triggerShake } = useShake();

  // 倒计时 effect
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
    const res = await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, purpose: "login" }),
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

    startTransition(async () => {
      if (mode === "password") {
        const res = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (res?.error || !res?.ok) {
          setError("邮箱或密码错误");
          triggerShake();
          return;
        }
        localStorage.setItem("lekao-account-exists", "true");
        router.push("/dashboard");
        router.refresh();
      } else {
        const res = await fetch("/api/auth/verify-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code, inviteCode }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "登录失败");
          triggerShake();
          return;
        }
        localStorage.setItem("lekao-account-exists", "true");
        router.push("/dashboard");
        router.refresh();
      }
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
              登录
            </span>
            <span className="h-px flex-1 bg-hairline" />
          </div>
          <h1 className="font-serif text-3xl font-semibold text-ink mb-2">
            继续你的教学工作
          </h1>
          <p className="font-serif italic text-sm text-ink-muted mb-6">
            登录后接着上次的进度。
          </p>

          {/* Tab 切换 · 用 layoutId 实现滑动指示器 */}
          <div
            className="relative flex gap-1 p-1 bg-canvas-alt rounded-xl mb-6"
            role="group"
            aria-label="登录方式"
          >
            <button
              type="button"
              aria-pressed={mode === "password"}
              onClick={() => {
                setMode("password");
                setError("");
                setMessage("");
              }}
              className={`relative flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                mode === "password"
                  ? "text-ink"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {mode === "password" && (
                <motion.span
                  layoutId="login-tab-indicator"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              邮箱密码
            </button>
            <button
              type="button"
              aria-pressed={mode === "code"}
              onClick={() => {
                setMode("code");
                setError("");
                setMessage("");
              }}
              className={`relative flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                mode === "code" ? "text-ink" : "text-ink-muted hover:text-ink"
              }`}
            >
              {mode === "code" && (
                <motion.span
                  layoutId="login-tab-indicator"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              邮箱验证码
            </button>
          </div>

          <motion.form
            key={shakeKey}
            onSubmit={handleSubmit}
            className={`space-y-4 ${error ? "anim-shake" : ""}`}
          >
            <div className="group">
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-ink mb-2 transition-colors group-focus-within:text-accent-text"
              >
                邮箱
              </label>
              <input
                id="login-email"
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

            {mode === "password" ? (
              <div className="group">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-ink mb-2 transition-colors group-focus-within:text-accent-text"
                >
                  密码
                </label>
                <input
                  id="login-password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-hairline rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
                />
              </div>
            ) : (
              <>
                <div className="group">
                  <label
                    htmlFor="login-code"
                    className="block text-sm font-medium text-ink mb-2 transition-colors group-focus-within:text-accent-text"
                  >
                    验证码
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      id="login-code"
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
                      disabled={cooldown > 0}
                      className="max-sm:w-full sm:px-4 py-2.5 min-h-11 bg-canvas-alt text-ink-mute rounded-lg text-sm font-medium hover:bg-hairline transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {cooldown > 0 ? `${cooldown}s` : "发送验证码"}
                    </button>
                  </div>
                </div>

                {/* 邀请码 (可选) */}
                <div className="group">
                  <label
                    htmlFor="login-invite"
                    className="block text-sm font-medium text-ink mb-2 transition-colors group-focus-within:text-accent-text"
                  >
                    邀请码{" "}
                    <span className="text-ink-subtle font-normal">
                      (可选，填了送 15 枚 T-Coin)
                    </span>
                  </label>
                  <input
                    id="login-invite"
                    type="text"
                    name="inviteCode"
                    autoComplete="off"
                    value={inviteCode}
                    onChange={(e) =>
                      setInviteCode(
                        e.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, "")
                          .slice(0, 8),
                      )
                    }
                    placeholder="选填"
                    className="w-full px-4 py-2.5 border border-hairline rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition font-mono text-sm tracking-wider"
                  />
                </div>
              </>
            )}

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
              {isPending ? "登录中..." : "登录"}
            </PressableButton>
          </motion.form>

          <div className="mt-6 text-center text-sm text-ink-muted">
            还没有账号？
            <Link
              href="/register"
              className="inline-block py-1 text-accent-text font-medium hover:text-accent-hover ml-1"
            >
              立即注册
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-ink-muted mt-6">
          登录即同意{" "}
          <Link
            href="/terms"
            className="underline decoration-hairline underline-offset-2 hover:decoration-ink-muted py-1 -my-1 inline-block"
          >
            服务条款
          </Link>{" "}
          和{" "}
          <Link
            href="/privacy"
            className="underline decoration-hairline underline-offset-2 hover:decoration-ink-muted py-1 -my-1 inline-block"
          >
            隐私政策
          </Link>
        </p>
      </div>
    </main>
  );
}
