"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useLocalStorageValue,
  setLocalStorageValue,
} from "@/lib/hooks/local-storage";
import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/hooks/motion";
import { useSession } from "next-auth/react";
import {
  AdminIcon,
  ChevronRightIcon,
  CollapseIcon,
  ExpandIcon,
  LogoutIcon,
} from "@/components/icons";
import { NAV_GROUPS } from "./navigation";

const STORAGE_KEY = "lekao-sidebar-collapsed";

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === "ADMIN";
  const reduced = useReducedMotion();

  // 收起状态：localStorage 为唯一真值（hook 的 getServerSnapshot 恒 null →
  // SSR 首帧渲染展开态，与旧 mounted 兜底等价，且无 effect setState）
  const collapsed = useLocalStorageValue(STORAGE_KEY) === "true";

  const toggle = () => {
    const next = !collapsed;
    setLocalStorageValue(STORAGE_KEY, String(next));
    // 通知同窗口 layout 同步 main margin
    window.dispatchEvent(new Event("lekao-sidebar-change"));
  };

  // width: 64 (collapsed) | 256 (expanded)
  const width = collapsed ? "w-16" : "w-64";

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
        {!collapsed && (
          <span className="text-lg font-semibold text-ink truncate">
            Lekao Agent
          </span>
        )}
      </Link>

      {/* Nav（2026-08-18 分组重构） */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.title} className={gi === 0 ? "" : "mt-4"}>
            {!collapsed && (
              <div className="pt-2 pb-1.5 px-3 text-xs font-medium text-ink-subtle uppercase tracking-wider">
                {group.title}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map(({ href, label, Icon }) => {
                // 主页精确匹配（startsWith 会把所有子页误判为主页 active）
                const active =
                  href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
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
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}
                    <Icon
                      className={`relative shrink-0 w-[18px] h-[18px] transition-colors ${
                        active
                          ? "text-accent-text"
                          : "text-ink-subtle group-hover:text-ink-mute"
                      }`}
                    />
                    {!collapsed && (
                      <span className="relative truncate">{label}</span>
                    )}
                    {active && !collapsed && (
                      <ChevronRightIcon className="relative ml-auto w-4 h-4 text-accent-text" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {isAdmin && !collapsed && (
          <div className="pt-4 pb-2 px-3 text-xs font-medium text-ink-subtle uppercase tracking-wider">
            管理
          </div>
        )}
        {isAdmin && (
          <Link
            href="/admin"
            title={collapsed ? "管理员后台" : undefined}
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
            {!collapsed && (
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
          {!collapsed && <span>收起侧边栏</span>}
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
        <div className="min-w-0 flex items-start gap-2.5">
          <span className="w-[3px] h-5 mt-0.5 bg-accent rounded-full shrink-0" />
          <div className="min-w-0">
            <h1 className="font-serif text-xl font-semibold text-ink truncate leading-tight">
              {title}
            </h1>
            {description && (
              <p className="font-serif italic text-xs text-ink-muted truncate mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* 右：额外元素 + 用户菜单 */}
        <div className="flex items-center gap-3 shrink-0">
          {rightExtra}
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white transition group"
            title={`个人中心 · ${session?.user?.email ?? ""}`}
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
