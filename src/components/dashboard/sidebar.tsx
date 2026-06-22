"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useSession } from "next-auth/react";
import {
  MistakeIcon,
  SummaryIcon,
  FeedbackIcon,
  AdminIcon,
  CollapseIcon,
  ExpandIcon,
  LogoutIcon,
  ProfileIcon,
  ChevronRightIcon,
  ClockIcon,
} from "@/components/icons";

const NAV_ITEMS = [
  { href: "/dashboard/mistake", label: "错题集生成", Icon: MistakeIcon },
  { href: "/dashboard/summary", label: "课堂小结", Icon: SummaryIcon },
  { href: "/dashboard/feedback", label: "作业/堂测反馈", Icon: FeedbackIcon },
  { href: "/dashboard/history", label: "生成历史", Icon: ClockIcon },
];

const STORAGE_KEY = "lekao-sidebar-collapsed";

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === "ADMIN";
  const reduced = useReducedMotion();

  // 收起状态（localStorage 持久化 + 初始 false 防 hydration mismatch）
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
    // 通知同窗口 layout 同步 main margin
    window.dispatchEvent(new Event("lekao-sidebar-change"));
  };

  // width: 64 (collapsed) | 256 (expanded)
  const width = mounted && collapsed ? "w-16" : "w-64";

  return (
    <aside
      className={`hidden md:flex fixed left-0 top-0 bottom-0 ${width} bg-white border-r border-hairline flex-col z-30 transition-[width] duration-200`}
    >
      {/* Logo */}
      <Link
        href="/"
        className="px-4 py-5 border-b border-hairline flex items-center gap-2 h-[68px]"
      >
        <div className="w-9 h-9 rounded-xl bg-accent-text text-white flex items-center justify-center text-lg font-bold font-mono shrink-0">
          L
        </div>
        {(!mounted || !collapsed) && (
          <span className="text-lg font-semibold text-ink truncate">
            Lekao <span className="text-ink-mute font-normal">Agent</span>
          </span>
        )}
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={mounted && collapsed ? label : undefined}
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
                className={`relative shrink-0 w-[18px] h-[18px] transition-colors ${
                  active ? "text-accent-text" : "text-ink-subtle group-hover:text-ink-mute"
                }`}
              />
              {(!mounted || !collapsed) && (
                <span className="relative truncate">{label}</span>
              )}
              {active && (!mounted || !collapsed) && (
                <ChevronRightIcon className="relative ml-auto w-4 h-4 text-accent-text" />
              )}
            </Link>
          );
        })}

        {isAdmin && (!mounted || !collapsed) && (
          <div className="pt-4 pb-2 px-3 text-xs font-medium text-ink-subtle uppercase tracking-wider">
            管理
          </div>
        )}
        {isAdmin && (
          <Link
            href="/admin"
            title={mounted && collapsed ? "管理员后台" : undefined}
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
              className={`relative shrink-0 w-[18px] h-[18px] ${
                pathname.startsWith("/admin")
                  ? "text-accent-text"
                  : "text-ink-subtle group-hover:text-ink-mute"
              }`}
            />
            {(!mounted || !collapsed) && (
              <span className="relative truncate">管理员后台</span>
            )}
          </Link>
        )}
      </nav>

      {/* Toggle 按钮（底部） */}
      <div className="border-t border-hairline p-2">
        <motion.button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
          whileTap={reduced ? undefined : { scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-ink-mute hover:bg-canvas-alt hover:text-ink rounded-lg transition-colors"
        >
          {collapsed ? (
            <ExpandIcon className="w-[18px] h-[18px] shrink-0" />
          ) : (
            <CollapseIcon className="w-[18px] h-[18px] shrink-0" />
          )}
          {(!mounted || !collapsed) && <span>收起侧边栏</span>}
        </motion.button>
      </div>
    </aside>
  );
}

/* ============================================
 * TopBar · 顶部导航（替代 sidebar 内的 user card）
 * 左侧：当前页面标题
 * 右侧：T-Coin 余额 + 用户菜单
 * ============================================ */

type TopBarProps = {
  title: string;
  description?: string;
  /** 右侧额外元素（如"扣 1 T-Coin" 标签） */
  rightExtra?: React.ReactNode;
};

export function TopBar({ title, description, rightExtra }: TopBarProps) {
  const { data: session } = useSession();

  return (
    <div className="sticky top-0 z-20 bg-canvas-alt/80 backdrop-blur-md border-b border-hairline">
      <div className="px-8 md:px-12 h-[68px] flex items-center justify-between gap-4">
        {/* 左：标题 */}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-ink truncate">{title}</h1>
          {description && (
            <p className="text-xs text-ink-muted truncate mt-0.5">
              {description}
            </p>
          )}
        </div>

        {/* 右：额外元素 + 用户菜单 */}
        <div className="flex items-center gap-3 shrink-0">
          {rightExtra}
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white transition group"
            title={session?.user?.email}
          >
            <div className="w-8 h-8 rounded-full bg-accent-soft text-accent-ink flex items-center justify-center text-sm font-semibold shrink-0">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <span className="hidden lg:inline text-sm text-ink-mute group-hover:text-ink truncate max-w-[160px]">
              {session?.user?.name ?? "用户"}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => {
              import("next-auth/react").then(({ signOut }) =>
                signOut({ callbackUrl: "/" }),
              );
            }}
            aria-label="退出登录"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-mute hover:bg-white hover:text-danger transition"
          >
            <LogoutIcon className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
