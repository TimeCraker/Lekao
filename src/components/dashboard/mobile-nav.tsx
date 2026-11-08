"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useSession } from "next-auth/react";
import { useDialogA11y } from "@/lib/hooks/dialog-a11y";
import { useReducedMotion } from "@/lib/hooks/motion";
import { cn } from "@/lib/utils";
import { CloseIcon, MenuIcon } from "@/components/icons";
import { APP_VERSION } from "@/lib/version";
import {
  ADMIN_NAV_ITEM,
  MOBILE_LOGOUT_ITEM,
  MOBILE_MORE_ITEMS,
  MOBILE_PRIMARY_ITEMS,
} from "./navigation";

/**
 * S01 T-005 · 移动端底部导航 + More sheet（规格 §3.4）
 *
 * - 4 个高频入口（四条核心生成流程）常驻底部，一次点击直达
 * - More sheet 承载控制台主页 / 我的记录 / 灵感墙 / 管理员 / 退出登录
 * - safe-area 适配、触点 ≥44px、当前项图标+文本双提示、focus trap + Esc（useDialogA11y）
 * - 桌面端不渲染（md:hidden），桌面继续用 Sidebar
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [moreOpen, setMoreOpen] = useState(false);
  const isAdmin = session?.user?.role === "ADMIN";

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <nav
        aria-label="移动端底部导航"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-hairline pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-stretch">
          {MOBILE_PRIMARY_ITEMS.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex-1 min-h-14 inline-flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-medium leading-tight transition",
                  active ? "text-accent-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="max-w-[72px] truncate">{label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className="flex-1 min-h-14 inline-flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-medium leading-tight text-ink-muted hover:text-ink transition"
          >
            <MenuIcon className="w-5 h-5 shrink-0" />
            <span>更多</span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <MoreSheet
            pathname={pathname}
            isAdmin={isAdmin}
            onClose={() => setMoreOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function MoreSheet({
  pathname,
  isAdmin,
  onClose,
}: {
  pathname: string;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const dialogRef = useDialogA11y({ open: true, onClose });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(href + "/");

  const items = isAdmin
    ? [...MOBILE_MORE_ITEMS, ADMIN_NAV_ITEM]
    : MOBILE_MORE_ITEMS;

  return (
    <div
      className="md:hidden fixed inset-0 z-50 flex items-end bg-ink/50"
      onClick={onClose}
    >
      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="更多入口"
        initial={reduced ? { opacity: 0 } : { y: "100%" }}
        animate={reduced ? { opacity: 1 } : { y: 0 }}
        exit={reduced ? { opacity: 0 } : { y: "100%" }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-[80vh] overflow-y-auto bg-white rounded-t-2xl border-t border-hairline pb-[calc(env(safe-area-inset-bottom)+0.5rem)] focus:outline-none"
      >
        <div className="sticky top-0 flex items-center justify-between px-5 py-3 bg-white border-b border-hairline">
          <span className="font-semibold text-ink">更多</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭更多入口"
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-ink-muted hover:bg-canvas-alt hover:text-ink transition"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <ul className="p-2">
          {items.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={onClose}
                aria-current={isActive(href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 min-h-14 px-3 rounded-lg text-sm transition",
                  isActive(href)
                    ? "text-accent-ink font-medium bg-accent-soft"
                    : "text-ink-mute hover:bg-canvas-alt hover:text-ink",
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {label}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => {
                onClose();
                void import("next-auth/react").then(({ signOut }) =>
                  signOut({ callbackUrl: "/" }),
                );
              }}
              className="w-full flex items-center gap-3 min-h-14 px-3 rounded-lg text-sm text-ink-mute hover:bg-canvas-alt hover:text-danger transition"
            >
              <MOBILE_LOGOUT_ITEM.Icon className="w-5 h-5 shrink-0" />
              {MOBILE_LOGOUT_ITEM.label}
            </button>
          </li>
        </ul>

        {/* 版本真值（S03 T-304）：单一来源 package.json，经 NEXT_PUBLIC_APP_VERSION 注入 */}
        <div className="px-5 pb-2 pt-1 text-[11px] text-ink-subtle">
          Lekao Agent v{APP_VERSION}
        </div>
      </motion.div>
    </div>
  );
}
