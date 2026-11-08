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
 * T44 · 仪表盘 5 数字卡横条
 *
 * 数字卡（Round 3 调整）:
 * 1. 累计用户（3 张表 userId 去重）
 * 2. 当前在线（Redis ZSET 30s 实时，5s 轮询）
 * 3. 历史最大在线（Redis peak 自上线起）
 * 4. 今日小结
 * 5. 今日反馈
 *
 * 错题次数 → 移除（改成"历史最大在线"）
 * 刷新策略：在线用 5s 轮询（实时），其他用 1min
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

export function TodayStrip() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const r = await fetch("/api/admin/analytics/overview");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json: OverviewData = await r.json();
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "加载失败");
        }
      }
    };
    fetchData();
    const timer = setInterval(fetchData, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-ink">T44 · 今日数据</h2>
        {error && <span className="text-xs text-danger-text">{error}</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="累计用户"
          value={data?.totalUsers ?? null}
          icon={<UsersIcon className="w-4 h-4" />}
          color="text-accent-text bg-accent-soft"
          suffix="人"
          note="3 张表 userId 去重"
        />
        <StatCard
          label="当前在线"
          value={data?.currentOnline ?? null}
          icon={<ProfileIcon className="w-4 h-4" />}
          color="text-success-text bg-success-soft"
          suffix="人"
          note="30s 滑动窗口 · 实时"
        />
        <StatCard
          label="历史最大在线"
          value={data?.peakOnline ?? null}
          icon={<CoinIcon className="w-4 h-4" />}
          color="text-warning-text bg-warning-soft"
          suffix="人"
          note="自上线起峰值"
        />
        <StatCard
          label="今日小结"
          value={data?.todaySummaries ?? null}
          icon={<DocumentIcon className="w-4 h-4" />}
          color="text-annotation-text bg-annotation-soft"
          suffix="次"
        />
        <StatCard
          label="今日反馈"
          value={data?.todayFeedbacks ?? null}
          icon={<DocumentIcon className="w-4 h-4" />}
          color="text-accent-text bg-accent-soft"
          suffix="次"
        />
      </div>
    </section>
  );
}
