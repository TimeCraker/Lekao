"use client";

import { useState, useTransition, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
          return;
        }
        localStorage.setItem("lekao-account-exists", "true");
        router.push("/dashboard");
        router.refresh();
      }
    });
  };

  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-accent-text text-white flex items-center justify-center text-xl font-bold font-mono">
            L
          </div>
          <span className="text-xl font-semibold text-ink">
            Lekao <span className="text-ink-mute font-normal">Agent</span>
          </span>
        </Link>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md p-8 border border-hairline">
          <h1 className="text-2xl font-semibold text-ink mb-2">欢迎回来</h1>
          <p className="text-sm text-ink-muted mb-6">登录后继续你的工作</p>

          {/* Tab 切换 */}
          <div className="flex gap-1 p-1 bg-canvas-alt rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("password");
                setError("");
                setMessage("");
              }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                mode === "password"
                  ? "bg-white text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              邮箱密码
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("code");
                setError("");
                setMessage("");
              }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                mode === "code"
                  ? "bg-white text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              邮箱验证码
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                邮箱
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 border border-hairline rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
              />
            </div>

            {mode === "password" ? (
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-hairline rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
                />
              </div>
            ) : (
              <>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  验证码
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) =>
                      setCode(
                        e.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    required
                    placeholder="6 位数字"
                    inputMode="numeric"
                    className="flex-1 px-4 py-2.5 border border-hairline rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition font-mono text-lg tracking-widest text-center"
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={cooldown > 0}
                    className="px-4 py-2.5 bg-canvas-alt text-ink-mute rounded-lg text-sm font-medium hover:bg-hairline transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {cooldown > 0 ? `${cooldown}s` : "发送验证码"}
                  </button>
                </div>
              </div>

              {/* 邀请码 (可选) */}
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  邀请码 <span className="text-ink-subtle font-normal">(可选，填了送 15 枚代币)</span>
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) =>
                    setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))
                  }
                  placeholder="选填"
                  className="w-full px-4 py-2.5 border border-hairline rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition font-mono text-sm tracking-wider"
                />
              </div>
              </>
            )}

            {error && (
              <div className="text-sm text-danger bg-danger/5 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}
            {message && (
              <div className="text-sm text-success bg-success/5 px-3 py-2 rounded-lg">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 bg-accent-text text-white rounded-lg font-medium hover:bg-accent-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "登录中..." : "登录"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-ink-muted">
            还没有账号？
            <Link
              href="/register"
              className="text-accent-text font-medium hover:text-accent-hover ml-1"
            >
              立即注册
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-ink-muted mt-6">
          登录即同意{" "}
          <Link href="#" className="hover:text-ink-muted">
            服务条款
          </Link>{" "}
          和{" "}
          <Link href="#" className="hover:text-ink-muted">
            隐私政策
          </Link>
        </p>
      </div>
    </main>
  );
}