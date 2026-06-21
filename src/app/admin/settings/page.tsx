"use client";

import { useState, useEffect } from "react";

interface SystemInfo {
  db: string;
  node: string;
  platform: string;
  uptime: number;
  memory: string;
}

export default function AdminSettingsPage() {
  const [info, setInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">系统设置</h1>

      {/* System Info */}
      <div className="rounded-xl border border-hairline bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-ink">系统信息</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-hairline pb-2">
            <span className="text-ink-muted">Node 版本</span>
            <span className="font-mono text-ink">{info?.node || "—"}</span>
          </div>
          <div className="flex justify-between border-b border-hairline pb-2">
            <span className="text-ink-muted">运行平台</span>
            <span className="font-mono text-ink">{info?.platform || "—"}</span>
          </div>
          <div className="flex justify-between border-b border-hairline pb-2">
            <span className="text-ink-muted">数据库</span>
            <span className="font-mono text-ink">{info?.db || "—"}</span>
          </div>
          <div className="flex justify-between border-b border-hairline pb-2">
            <span className="text-ink-muted">运行时间</span>
            <span className="font-mono text-ink">
              {info ? `${Math.floor(info.uptime / 3600)}h ${Math.floor((info.uptime % 3600) / 60)}m` : "—"}
            </span>
          </div>
          <div className="flex justify-between pb-2">
            <span className="text-ink-muted">内存使用</span>
            <span className="font-mono text-ink">{info?.memory || "—"}</span>
          </div>
        </div>
      </div>

      {/* AI Config */}
      <div className="rounded-xl border border-hairline bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-ink">AI 服务配置</h3>
        <p className="text-xs text-ink-muted">
          当前通过环境变量配置。SiliconFlow API Key 已设置，使用 Qwen3-VL-8B-Instruct + DeepSeek V4 Flash。
        </p>
      </div>

      {/* T-Coin Config */}
      <div className="rounded-xl border border-hairline bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-ink">T-Coin 配置</h3>
        <p className="text-xs text-ink-muted">
          每次课堂小结消耗 0.05 T-Coin，每次堂测反馈消耗 0.05 T-Coin。
          双池扣费：优先扣赠送币（lekao_gift_coin）。
        </p>
      </div>

      {/* Invite Code Config */}
      <div className="rounded-xl border border-hairline bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-ink">邀请码机制</h3>
        <p className="text-xs text-ink-muted">
          用户注册需要邀请码。可在"邀请码管理"页面生成，支持自定义前缀。
        </p>
      </div>
    </div>
  );
}
