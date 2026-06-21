"use client";

import { useState, useEffect } from "react";
import { CoinIcon, CopyIcon, CheckIcon } from "@/components/icons";

interface InviteCode {
  id: string;
  code: string;
  used: boolean;
  usedByUserId: string | null;
  usedAt: string | null;
  createdAt: string;
}

export default function AdminInviteCodesPage() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [total, setTotal] = useState(0);
  const [used, setUsed] = useState(0);
  const [count, setCount] = useState(10);
  const [prefix, setPrefix] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState(-1);

  useEffect(() => {
    fetch("/api/admin/invite-codes")
      .then((r) => r.json())
      .then((d) => {
        setCodes(d.codes ?? []);
        setTotal(d.total ?? 0);
        setUsed(d.used ?? 0);
      });
  }, []);

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, prefix: prefix.trim() || undefined }),
      });
      const d = await res.json();
      if (res.ok) {
        setGenerated(d.codes ?? []);
        // Refresh list
        const listRes = await fetch("/api/admin/invite-codes");
        const listData = await listRes.json();
        setCodes(listData.codes ?? []);
        setTotal(listData.total ?? 0);
        setUsed(listData.used ?? 0);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function copyAll() {
    const text = generated.join("\n");
    await navigator.clipboard.writeText(text);
    setCopiedIndex(0);
    setTimeout(() => setCopiedIndex(-1), 2000);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">邀请码管理</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-hairline bg-white p-4">
          <p className="text-2xl font-bold text-ink">{total}</p>
          <p className="text-xs text-ink-muted">总计</p>
        </div>
        <div className="rounded-xl border border-hairline bg-white p-4">
          <p className="text-2xl font-bold text-green-600">{used}</p>
          <p className="text-xs text-ink-muted">已使用</p>
        </div>
        <div className="rounded-xl border border-hairline bg-white p-4">
          <p className="text-2xl font-bold text-ink-muted">{total - used}</p>
          <p className="text-xs text-ink-muted">未使用</p>
        </div>
      </div>

      {/* Generate */}
      <div className="rounded-xl border border-hairline bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-ink">生成邀请码</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="mb-1 block text-xs text-ink-muted">数量</label>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              className="w-24 rounded border border-hairline bg-canvas px-3 py-1.5 text-sm text-ink"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-muted">前缀（可选）</label>
            <input
              placeholder="例: LEKAO"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              className="w-40 rounded border border-hairline bg-canvas px-3 py-1.5 text-sm text-ink"
            />
          </div>
          <button
            onClick={generate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-text px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            <CoinIcon className="w-4 h-4" />
            {generating ? "生成中..." : "生成"}
          </button>
        </div>

        {/* Generated result */}
        {generated.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-green-600">
                已生成 {generated.length} 个邀请码
              </span>
              <button
                onClick={copyAll}
                className="inline-flex items-center gap-1 text-xs text-accent-text hover:text-accent-hover"
              >
                {copiedIndex === 0 ? (
                  <CheckIcon className="w-3.5 h-3.5" />
                ) : (
                  <CopyIcon className="w-3.5 h-3.5" />
                )}
                {copiedIndex === 0 ? "已复制" : "全部复制"}
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg bg-canvas-alt p-3 font-mono text-xs text-ink space-y-1">
              {generated.map((c, i) => (
                <div key={i}>{c}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Code list */}
      <div className="rounded-xl border border-hairline bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-hairline">
          <h3 className="text-sm font-semibold text-ink">邀请码列表（最近 100 条）</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs text-ink-subtle">
              <th className="px-5 py-3 font-medium">邀请码</th>
              <th className="px-5 py-3 font-medium">状态</th>
              <th className="px-5 py-3 font-medium">使用时间</th>
              <th className="px-5 py-3 font-medium">生成时间</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-b border-hairline hover:bg-canvas-alt/50">
                <td className="px-5 py-2.5 font-mono text-xs text-ink">{c.code}</td>
                <td className="px-5 py-2.5">
                  {c.used ? (
                    <span className="rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-600 font-medium">
                      已使用
                    </span>
                  ) : (
                    <span className="rounded bg-canvas-alt px-1.5 py-0.5 text-xs text-ink-subtle">
                      未使用
                    </span>
                  )}
                </td>
                <td className="px-5 py-2.5 text-xs text-ink-subtle">
                  {c.usedAt ? new Date(c.usedAt).toLocaleString("zh-CN") : "—"}
                </td>
                <td className="px-5 py-2.5 text-xs text-ink-subtle">
                  {new Date(c.createdAt).toLocaleString("zh-CN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
