"use client";

import { useEffect, useState } from "react";
import { useFinePointer } from "@/lib/hooks/capability";

/**
 * T44 · Navbar 在线人数徽章
 *
 * - 5s 轮询 /api/admin/online-users
 * - 红点 pulse 动画（仅 >= 1 人时动画，否则静止避免装饰噪音）
 * - 错误时降级显示数字不变
 * - 触屏设备不渲染（参考 [[avant-garde-design]] §触屏设备 3D 倾斜浪费 GPU）
 */

interface OnlineData {
  online: number;
  asOf: number;
}

export function OnlineBadge() {
  const [data, setData] = useState<OnlineData | null>(null);
  // 仅鼠标设备渲染 pulse（触屏静止避免浪费 GPU）
  const isFinePointer = useFinePointer();

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const r = await fetch("/api/admin/online-users");
        if (!r.ok) return;
        const json: OnlineData = await r.json();
        if (!cancelled) setData(json);
      } catch {
        // 静默失败（监控告警会兜底）
      }
    };
    fetchData();
    const timer = setInterval(fetchData, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const count = data?.online ?? 0;

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-soft border border-success/20 transition"
      title={`数据时间：${data ? new Date(data.asOf).toLocaleTimeString("zh-CN") : "加载中"}`}
    >
      <span
        className={`inline-block w-2 h-2 rounded-full bg-success ${
          isFinePointer && count > 0 ? "animate-pulse" : ""
        }`}
        style={{ flexShrink: 0 }}
      />
      <span className="text-xs font-medium text-success-text whitespace-nowrap">
        {count} 在线
      </span>
    </div>
  );
}
