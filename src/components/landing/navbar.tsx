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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          {/* ⭐ 2026-06-22 收尾：移动端紧凑布局 */}
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <img
              src="/lekao-mark.svg"
              alt="LeKao"
              className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0"
            />
            <span className="text-base sm:text-lg font-semibold text-ink tracking-tight truncate">
              LeKao
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs sm:text-sm text-ink-mute hidden md:inline truncate max-w-[160px]">
              {session.user?.name ?? session.user?.email}
            </span>
            <Link
              href="/dashboard"
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-accent-text text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-accent-hover transition flex items-center gap-1 sm:gap-1.5 whitespace-nowrap"
            >
              <span className="hidden sm:inline">进入控制台</span>
              <span className="sm:hidden">控制台</span>
              <ArrowRightIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-canvas/80 backdrop-blur-md border-b border-hairline">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <img
            src="/lekao-mark.svg"
            alt="LeKao"
            className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0"
          />
          <span className="text-base sm:text-lg font-semibold text-ink tracking-tight truncate">
            LeKao
          </span>
        </Link>

        {/* Right */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-accent-text text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-accent-hover transition flex items-center gap-1 sm:gap-1.5 whitespace-nowrap"
          >
            登录
            <ArrowRightIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </Link>
          <Link
            href={freeStartHref}
            className="hidden sm:inline-flex px-4 py-2 bg-white border border-hairline text-ink text-sm font-medium rounded-lg hover:border-accent-text hover:text-accent-ink transition whitespace-nowrap"
          >
            免费开始
          </Link>
        </div>
      </div>
    </nav>
  );
}
