"use client";

import { useState, useEffect } from "react";
import {
  ProfileIcon,
  DocumentIcon,
  CoinIcon,
  DashboardIcon,
  UsersIcon,
} from "@/components/icons";

interface Stats {
  totalUsers: number;
  totalSummaries: number;
  totalFeedbacks: number;
  totalInviteCodes: number;
  usedInviteCodes: number;
  totalCoinSpent: number;
  recentUsers: Array<{
    id: string;
    email: string;
    name: string | null;
    role: string;
    lekao_gift_coin: number;
    t_coin: number;
    createdAt: string;
  }>;
  dailySignups: Array<{ date: string; count: number }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return <div className="py-20 text-center text-danger">加载失败: {error}</div>;
  }
  if (!stats) {
    return <div className="py-20 text-center text-ink-subtle">加载中...</div>;
  }

  const cards = [
    {
      label: "总用户",
      value: stats.totalUsers,
      Icon: ProfileIcon,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "课堂小结",
      value: stats.totalSummaries,
      Icon: DocumentIcon,
      color: "text-purple-600 bg-purple-50",
    },
    {
      label: "堂测反馈",
      value: stats.totalFeedbacks,
      Icon: DocumentIcon,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "T-Coin 消耗",
      value: stats.totalCoinSpent,
      Icon: CoinIcon,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "邀请码总计",
      value: stats.totalInviteCodes,
      Icon: UsersIcon,
      color: "text-cyan-600 bg-cyan-50",
    },
    {
      label: "已用邀请码",
      value: stats.usedInviteCodes,
      Icon: DashboardIcon,
      color: "text-rose-600 bg-rose-50",
    },
  ];

  const maxSignup = Math.max(...stats.dailySignups.map((d) => d.count), 1);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-ink">数据概览</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-hairline bg-white p-4"
          >
            <div className={`mb-2 inline-flex rounded-lg p-2 ${c.color}`}>
              <c.Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-ink">
              {c.value.toLocaleString()}
            </p>
            <p className="text-xs text-ink-muted">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Signups */}
        <div className="rounded-xl border border-hairline bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-ink">近 7 天注册趋势</h3>
          <div className="flex items-end gap-1" style={{ height: 120 }}>
            {stats.dailySignups.length === 0 ? (
              <p className="text-sm text-ink-subtle">暂无数据</p>
            ) : (
              stats.dailySignups.map((d, i) => {
                const h = Math.max(4, (d.count / maxSignup) * 100);
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] text-ink-subtle">{d.count}</span>
                    <div
                      className="w-full rounded-t bg-accent"
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-[8px] text-ink-subtle">
                      {d.date.slice(5)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Usage pie */}
        <div className="rounded-xl border border-hairline bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-ink">内容生成分布</h3>
          <div className="space-y-3">
            {[
              {
                label: "课堂小结",
                value: stats.totalSummaries,
                color: "bg-purple-500",
              },
              {
                label: "堂测反馈",
                value: stats.totalFeedbacks,
                color: "bg-green-500",
              },
            ].map((f) => {
              const total = stats.totalSummaries + stats.totalFeedbacks || 1;
              return (
                <div key={f.label} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-ink-muted">{f.label}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-canvas-alt">
                    <div
                      className={`h-2 rounded-full ${f.color}`}
                      style={{ width: `${(f.value / total) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-xs font-medium text-ink">
                    {f.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Users */}
      <div className="rounded-xl border border-hairline bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-ink">最近注册</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs text-ink-subtle">
              <th className="pb-2 font-medium">邮箱</th>
              <th className="pb-2 font-medium">姓名</th>
              <th className="pb-2 font-medium">角色</th>
              <th className="pb-2 font-medium">赠送币</th>
              <th className="pb-2 font-medium">充值币</th>
              <th className="pb-2 font-medium">注册时间</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentUsers.map((u) => (
              <tr key={u.id} className="border-b border-hairline">
                <td className="py-2 text-ink">{u.email}</td>
                <td className="py-2 text-ink-muted">{u.name || "—"}</td>
                <td className="py-2">
                  {u.role === "admin" ? (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700 font-medium">
                      Admin
                    </span>
                  ) : (
                    <span className="text-xs text-ink-subtle">User</span>
                  )}
                </td>
                <td className="py-2 text-ink">{u.lekao_gift_coin}</td>
                <td className="py-2 text-ink">{u.t_coin}</td>
                <td className="py-2 text-xs text-ink-subtle">
                  {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
