"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { motion } from "motion/react";
import {
  OverviewIcon,
  MistakeIcon,
  SummaryIcon,
  FeedbackIcon,
  AdminIcon,
} from "@/components/landing/icons";

const NAV_ITEMS = [
  { href: "/dashboard", label: "概览", Icon: OverviewIcon },
  { href: "/dashboard/mistake", label: "错题集生成", Icon: MistakeIcon },
  { href: "/dashboard/summary", label: "课堂小结", Icon: SummaryIcon },
  { href: "/dashboard/feedback", label: "课堂反馈", Icon: FeedbackIcon },
];

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === "admin";

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-hairline flex-col z-30">
      {/* Logo */}
      <Link
        href="/"
        className="px-6 py-5 border-b border-hairline flex items-center gap-2"
      >
        <div className="w-9 h-9 rounded-xl bg-accent-text text-white flex items-center justify-center text-lg font-bold font-mono">
          L
        </div>
        <span className="text-lg font-semibold text-ink">
          Lekao <span className="text-ink-mute font-normal">Agent</span>
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition group ${
                active
                  ? "text-accent-ink font-medium"
                  : "text-ink-mute hover:bg-canvas-alt hover:text-ink"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-accent-soft rounded-lg"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon
                className={`relative w-[18px] h-[18px] transition-colors ${
                  active ? "text-accent-text" : "text-ink-subtle group-hover:text-ink-mute"
                }`}
              />
              <span className="relative">{label}</span>
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-4 pb-2 px-3 text-xs font-medium text-ink-subtle uppercase tracking-wider">
              管理
            </div>
            <Link
              href="/admin"
              className={`relative flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition group ${
                pathname.startsWith("/admin")
                  ? "text-accent-ink font-medium"
                  : "text-ink-mute hover:bg-canvas-alt hover:text-ink"
              }`}
            >
              {pathname.startsWith("/admin") && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-accent-soft rounded-lg"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <AdminIcon
                className={`relative w-[18px] h-[18px] ${
                  pathname.startsWith("/admin")
                    ? "text-accent-text"
                    : "text-ink-subtle group-hover:text-ink-mute"
                }`}
              />
              <span className="relative">管理员后台</span>
            </Link>
          </>
        )}
      </nav>

      {/* User card · 点击跳 profile */}
      <Link
        href="/dashboard/profile"
        className="block px-3 py-4 border-t border-hairline hover:bg-canvas-alt transition group"
      >
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="w-9 h-9 rounded-full bg-accent-soft text-accent-ink flex items-center justify-center text-sm font-semibold shrink-0">
            {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink truncate group-hover:text-accent-ink transition">
              {session?.user?.name ?? "用户"}
            </div>
            <div className="text-xs text-ink-subtle truncate">
              {session?.user?.email}
            </div>
          </div>
          <span className="text-ink-subtle group-hover:text-accent-text transition text-xs">
            ›
          </span>
        </div>
      </Link>

      {/* 退出登录 (单独一行) */}
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="mx-3 mb-4 flex items-center justify-center gap-2 px-3 py-2 text-sm text-ink-mute hover:bg-canvas-alt hover:text-danger rounded-lg transition"
      >
        退出登录
      </button>
    </aside>
  );
}
