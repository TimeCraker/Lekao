"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "概览", icon: "📊" },
  { href: "/dashboard/mistake", label: "错题集生成", icon: "📋" },
  { href: "/dashboard/summary", label: "课堂小结", icon: "📝" },
  { href: "/dashboard/feedback", label: "课堂反馈", icon: "💬" },
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
        <span className="text-lg font-semibold text-ink">Lekao</span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition ${
                active
                  ? "bg-accent-soft text-accent-ink font-medium"
                  : "text-ink-mute hover:bg-canvas-alt hover:text-ink"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
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
              className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition ${
                pathname.startsWith("/admin")
                  ? "bg-accent-soft text-accent-ink font-medium"
                  : "text-ink-mute hover:bg-canvas-alt hover:text-ink"
              }`}
            >
              <span className="text-base">⚙️</span>
              管理员后台
            </Link>
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-hairline">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-accent-soft text-accent-ink flex items-center justify-center text-sm font-semibold">
            {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink truncate">
              {session?.user?.name ?? "用户"}
            </div>
            <div className="text-xs text-ink-subtle truncate">
              {session?.user?.email}
            </div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full mt-2 px-3 py-2 text-sm text-ink-mute hover:bg-canvas-alt hover:text-ink rounded-lg transition"
        >
          退出登录
        </button>
      </div>
    </aside>
  );
}