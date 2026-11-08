"use client";

import { useEffect, useState } from "react";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileBottomNav } from "@/components/dashboard/mobile-nav";

const STORAGE_KEY = "lekao-sidebar-collapsed";

/**
 * Dashboard 壳层（client）· 从 layout.tsx 抽出
 * layout 本身改为 server 组件以支持 metadata 导出，
 * 避免 client layout 让 children 走独立流式分段（body 下残留 S:0 隐藏副本 → h1/内容对读屏重复）。
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  // 用 main margin 配合 sidebar 收起状态
  // SSR 用 w-64 兜底（client mount 后再调整）
  const [marginLeft, setMarginLeft] = useState("md:ml-64");

  useEffect(() => {
    const sync = () => {
      const collapsed = localStorage.getItem(STORAGE_KEY) === "true";
      setMarginLeft(collapsed ? "md:ml-16" : "md:ml-64");
    };
    sync();
    // 监听 storage 事件（侧边栏收起变化时）
    window.addEventListener("storage", sync);
    // 监听自定义事件（同窗口内 sidebar toggle 触发）
    window.addEventListener("lekao-sidebar-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("lekao-sidebar-change", sync);
    };
  }, []);

  return (
    <Providers>
      {/* 键盘 skip link：Tab 首个可达，聚焦时可见 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 focus:px-4 focus:py-2 focus:bg-accent-text focus:text-white focus:text-sm focus:font-medium focus:rounded-lg focus:shadow-lg"
      >
        跳到主内容
      </a>
      <div className="min-h-screen flex bg-canvas-alt">
        <Sidebar />
        <MobileBottomNav />
        <main
          id="main-content"
          className={`flex-1 ${marginLeft} pt-0 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0 min-w-0 transition-[margin] duration-200`}
        >
          {children}
        </main>
      </div>
    </Providers>
  );
}
