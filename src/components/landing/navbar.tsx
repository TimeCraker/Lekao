"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowRightIcon } from "@/components/icons";

const ACCOUNT_KEY = "lekao-account-exists";

export function Navbar() {
  const { data: session, status } = useSession();
  const [freeStartHref, setFreeStartHref] = useState("/register");

  // localStorage 记忆：用户是否已注册过
  useEffect(() => {
    const has = localStorage.getItem(ACCOUNT_KEY) === "true";
    setFreeStartHref(has ? "/login" : "/register");
  }, []);

  // 已登录 → 直接跳 dashboard
  if (status === "authenticated" && session) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-canvas/80 backdrop-blur-md border-b border-hairline">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-accent-text text-white flex items-center justify-center text-lg font-bold font-mono">
              L
            </div>
            <span className="text-lg font-semibold text-ink tracking-tight">
              Lekao <span className="text-ink-mute font-normal">Agent</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-mute hidden sm:inline">
              {session.user?.name ?? session.user?.email}
            </span>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-accent-text text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition flex items-center gap-1.5"
            >
              进入控制台
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-canvas/80 backdrop-blur-md border-b border-hairline">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-accent-text text-white flex items-center justify-center text-lg font-bold font-mono">
            L
          </div>
          <span className="text-lg font-semibold text-ink tracking-tight">
            Lekao <span className="text-ink-mute font-normal">Agent</span>
          </span>
        </Link>

        {/* Right */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 bg-accent-text text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition flex items-center gap-1.5"
          >
            登录
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={freeStartHref}
            className="px-4 py-2 bg-white border border-hairline text-ink text-sm font-medium rounded-lg hover:border-accent-text hover:text-accent-ink transition"
          >
            免费开始
          </Link>
        </div>
      </div>
    </nav>
  );
}