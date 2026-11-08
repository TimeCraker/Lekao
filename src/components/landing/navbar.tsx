"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useLocalStorageValue } from "@/lib/hooks/local-storage";
import { ArrowRightIcon } from "@/components/icons";

const ACCOUNT_KEY = "lekao-account-exists";

export function Navbar() {
  const { data: session, status } = useSession();
  // localStorage 记忆：用户是否已注册过
  // SSR 首帧恒 /register；hydration 后按 localStorage 校正（不写 effect setState）
  const accountExists = useLocalStorageValue(ACCOUNT_KEY);
  const freeStartHref = accountExists === "true" ? "/login" : "/register";
  // ⭐ 2026-06-22 v2.0.0+：滚动渐浓
  const [scrolled, setScrolled] = useState(false);

  // 滚动监听（20px 阈值）
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // 共享 nav class：滚动后背景更实、border 显隐
  const navClass = cn(
    "fixed top-0 left-0 right-0 z-50 backdrop-blur-md transition-colors duration-300",
    scrolled
      ? "bg-canvas/95 border-b border-hairline"
      : "bg-canvas/60 border-b border-transparent",
  );

  // 已登录 → 直接跳 dashboard
  if (status === "authenticated" && session) {
    return (
      <nav className={navClass}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          {/* ⭐ 2026-06-22 收尾：移动端紧凑布局 */}
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <Image
              src="/lekao-mark.svg"
              alt=""
              width={32}
              height={32}
              priority
              unoptimized
              className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0"
            />
            <span className="font-serif text-base sm:text-lg font-semibold text-ink tracking-tight truncate">
              Lekao Agent
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
    <nav className={navClass}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <Image
            src="/lekao-mark.svg"
            alt=""
            width={32}
            height={32}
            priority
            unoptimized
            className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0"
          />
          <span className="text-base sm:text-lg font-semibold text-ink tracking-tight truncate">
            Lekao Agent
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
