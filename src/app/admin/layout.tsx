"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardIcon,
  ProfileIcon,
  DocumentIcon,
  CoinIcon,
  AdminIcon,
  HistoryIcon,
  ShieldIcon,
} from "@/components/icons";

const NAV_ITEMS = [
  { href: "/admin", label: "数据概览", Icon: DashboardIcon },
  { href: "/admin/users", label: "用户管理", Icon: ProfileIcon },
  { href: "/admin/coin-log", label: "调币流水", Icon: CoinIcon },
  { href: "/admin/audit-log", label: "审计日志", Icon: ShieldIcon },
  { href: "/admin/invite-codes", label: "邀请码管理", Icon: HistoryIcon },
  { href: "/admin/history", label: "内容历史", Icon: DocumentIcon },
  { href: "/admin/settings", label: "系统设置", Icon: AdminIcon },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-canvas-alt flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-white border-r border-hairline hidden md:flex flex-col">
        <div className="p-5 border-b border-hairline">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-text text-white flex items-center justify-center text-sm font-bold font-mono">
              A
            </div>
            <span className="font-semibold text-ink">管理后台</span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
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
      </div>

      {/* Content */}
      <main className="flex-1 p-6 md:p-8 pt-16 md:pt-8">{children}</main>
    </div>
  );
}
