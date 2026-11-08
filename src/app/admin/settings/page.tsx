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
      <h1 className="font-serif text-2xl font-semibold text-ink">系统设置</h1>

      {/* System Info */}
      <div className="rounded-xl border border-hairline bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink">系统信息</h2>
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
              {info
                ? `${Math.floor(info.uptime / 3600)}h ${Math.floor((info.uptime % 3600) / 60)}m`
                : "—"}
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
        <h2 className="mb-4 text-sm font-semibold text-ink">AI 服务配置</h2>
        <p className="text-xs text-ink-muted">
          视觉与文本模型由环境变量配置。默认 Qwen3-VL-8B-Instruct（硅基流动）与
          DeepSeek V4 Flash。未单独设置 VISION_API_KEY / TEXT_API_KEY
          时，分别回退 SILICONFLOW_API_KEY / DEEPSEEK_API_KEY。
        </p>
      </div>

      {/* T-Coin Config */}
      <div className="rounded-xl border border-hairline bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink">T-Coin 配置</h2>
        <p className="text-xs text-ink-muted">
          课堂小结、作业/堂测反馈各消耗 1 T-Coin/次，周末反馈表消耗 1
          T-Coin/Sheet。生成成功才结算，失败自动释放。优先扣赠送币（lekao_gift_coin），再扣充值币（t_coin）。
        </p>
      </div>

      {/* Invite Code Config */}
      <div className="rounded-xl border border-hairline bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink">邀请码机制</h2>
        <p className="text-xs text-ink-muted">
          注册不需要邀请码。登录时可填写邀请码，兑换成功加 15
          枚赠送币，每人限兑一次。邀请码在「邀请码管理」生成。
        </p>
      </div>
    </div>
  );
}
