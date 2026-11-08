"use client";

import { useState, useEffect } from "react";
import {
  ProfileIcon,
  UsersIcon,
  DocumentIcon,
  CoinIcon,
} from "@/components/icons";
import { StatCard } from "./StatCard";

/**
 * T44 · analytics 页面顶部 5 数字卡横条（实时轮询）
 *
 * Round 3 调整: 移除 DAU，加入当前在线 + 历史最大在线
 * 5s 轮询（在线人数实时）
 */

interface OverviewData {
  totalUsers: number;
  currentOnline: number;
  peakOnline: number;
  todaySummaries: number;
  todayFeedbacks: number;
  todayMistake: null;
}

const REFRESH_MS = 5_000; // 5s 轮询（在线人数实时）

export function AnalyticsOverviewStrip({
  initialOverview,
}: {
  initialOverview: OverviewData;
}) {
  const [data, setData] = useState<OverviewData>(initialOverview);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const r = await fetch("/api/admin/analytics/overview");
        if (!r.ok) return;
        const json: OverviewData = await r.json();
        setData(json);
      } catch {
        // 静默失败
      }
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard
        label="累计用户"
        value={data.totalUsers}
        icon={<UsersIcon className="w-4 h-4" />}
        color="text-accent-text bg-accent-soft"
        suffix="人"
        note="3 张表 userId 去重"
      />
      <StatCard
        label="当前在线"
        value={data.currentOnline}
        icon={<ProfileIcon className="w-4 h-4" />}
        color="text-success-text bg-success-soft"
        suffix="人"
        note="30s 滑动窗口 · 实时"
      />
      <StatCard
        label="历史最大在线"
        value={data.peakOnline}
        icon={<CoinIcon className="w-4 h-4" />}
        color="text-warning-text bg-warning-soft"
        suffix="人"
        note="自上线起峰值"
      />
      <StatCard
        label="今日小结"
        value={data.todaySummaries}
        icon={<DocumentIcon className="w-4 h-4" />}
        color="text-annotation-text bg-annotation-soft"
        suffix="次"
      />
      <StatCard
        label="今日反馈"
        value={data.todayFeedbacks}
        icon={<DocumentIcon className="w-4 h-4" />}
        color="text-accent-text bg-accent-soft"
        suffix="次"
      />
    </div>
  );
}
