"use client";

import { useEffect, useState } from "react";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/dashboard/sidebar";

const STORAGE_KEY = "lekao-sidebar-collapsed";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <div className="min-h-screen flex bg-canvas-alt">
        <Sidebar />
        <main className={`flex-1 ${marginLeft} min-w-0 transition-[margin] duration-200`}>
          {children}
        </main>
      </div>
    </Providers>
  );
}