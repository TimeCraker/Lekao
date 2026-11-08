"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import {
  DashboardIcon,
  ProfileIcon,
  DocumentIcon,
  CoinIcon,
  AdminIcon,
  HistoryIcon,
  ShieldIcon,
  LightbulbIcon,
  ChartIcon,
  ChevronDownIcon,
} from "@/components/icons";
import { OnlineBadge } from "@/components/admin/OnlineBadge";

const NAV_ITEMS = [
  { href: "/admin", label: "数据概览", Icon: DashboardIcon },
  { href: "/admin/analytics", label: "数据分析", Icon: ChartIcon },
  { href: "/admin/users", label: "用户管理", Icon: ProfileIcon },
  { href: "/admin/coin-log", label: "调币流水", Icon: CoinIcon },
  { href: "/admin/audit-log", label: "审计日志", Icon: ShieldIcon },
  { href: "/admin/invite-codes", label: "邀请码管理", Icon: HistoryIcon },
  { href: "/admin/history", label: "内容历史", Icon: DocumentIcon },
  { href: "/admin/settings", label: "系统设置", Icon: AdminIcon },
];

const IDEAS_SUB_ITEMS = [
  { href: "/admin/ideas", label: "灵感列表" },
  { href: "/admin/ideas/comments", label: "评论管理" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ideasActive = pathname.startsWith("/admin/ideas");
  const [ideasOpen, setIdeasOpen] = useState(ideasActive);

  // 当前在灵感墙任一子项时，自动展开。
  // 渲染期按 route 变化调整 state（React 官方 "adjusting state when props change" 模式）：
  // 避免 effect 内同步 setState 触发级联渲染。
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    if (ideasActive) setIdeasOpen(true);
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-canvas-alt flex">
        {/* 键盘 skip link：Tab 首个可达，聚焦时可见 */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 focus:px-4 focus:py-2 focus:bg-accent-text focus:text-white focus:text-sm focus:font-medium focus:rounded-lg focus:shadow-lg"
        >
          跳到主内容
        </a>
        {/* Sidebar */}
        <aside className="w-56 shrink-0 bg-white border-r border-hairline hidden md:flex flex-col">
          <div className="p-5 border-b border-hairline space-y-3">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent-text text-white flex items-center justify-center text-sm font-bold font-mono">
                A
              </div>
              <span className="font-semibold text-ink">管理后台</span>
            </Link>
            {/* ⭐ T44 在线人数徽章（5s 轮询，30s 滑动窗口） */}
            <OnlineBadge />
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? "bg-accent-soft text-accent-text"
                      : "text-ink-muted hover:text-ink hover:bg-canvas-alt"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </Link>
              );
            })}

            {/* 灵感墙管理（可展开） */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIdeasOpen((v) => !v)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  ideasActive
                    ? "bg-accent-soft text-accent-text"
                    : "text-ink-muted hover:text-ink hover:bg-canvas-alt"
                }`}
              >
                <LightbulbIcon className="w-5 h-5" />
                <span className="flex-1 text-left">灵感墙管理</span>
                <motion.span
                  animate={{ rotate: ideasOpen ? 180 : 0 }}
                  transition={{ duration: 0.18 }}
                  className="shrink-0"
                >
                  <ChevronDownIcon className="w-3.5 h-3.5" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {ideasOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1 ml-3 pl-3 border-l border-hairline space-y-0.5">
                      {IDEAS_SUB_ITEMS.map(({ href, label }) => {
                        const isActive = pathname === href;
                        return (
                          <Link
                            key={href}
                            href={href}
                            className={`block px-3 py-1.5 rounded-md text-xs transition ${
                              isActive
                                ? "bg-accent-soft text-accent-text font-medium"
                                : "text-ink-muted hover:text-ink hover:bg-canvas-alt"
                            }`}
                          >
                            {label}
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          <div className="p-3 border-t border-hairline">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ink-muted hover:text-ink hover:bg-canvas-alt transition"
            >
              ← 返回工作台
            </Link>
          </div>
        </aside>

        {/* Mobile top nav */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-hairline px-4 py-3 flex items-center gap-2 overflow-x-auto">
          {/* ⭐ T44 移动端在线人数徽章 */}
          <OnlineBadge />
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? "bg-accent-soft text-accent-text"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
          {/* Mobile: 灵感墙两项平铺 */}
          <Link
            href="/admin/ideas"
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              pathname === "/admin/ideas"
                ? "bg-accent-soft text-accent-text"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <LightbulbIcon className="w-4 h-4" />
            灵感列表
          </Link>
          <Link
            href="/admin/ideas/comments"
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              pathname === "/admin/ideas/comments"
                ? "bg-accent-soft text-accent-text"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            评论管理
          </Link>
        </div>

        {/* Content */}
        <main id="main-content" className="flex-1 p-6 md:p-8 pt-16 md:pt-8">
          {children}
        </main>
      </div>
    </MotionConfig>
  );
}
