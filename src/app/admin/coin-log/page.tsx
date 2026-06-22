"use client";

import { useState, useEffect, useCallback } from "react";
import { CoinIcon, SearchIcon } from "@/components/icons";

interface CoinLog {
  id: string;
  userId: string;
  adminId: string;
  amount: number;
  beforeGift: number;
  beforePaid: number;
  afterGift: number;
  afterPaid: number;
  reason: string | null;
  createdAt: string;
  user: { email: string; name: string | null };
  admin: { email: string; name: string | null };
}

export default function AdminCoinLogPage() {
  const [logs, setLogs] = useState<CoinLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [emailQuery, setEmailQuery] = useState("");
  const [emailInput, setEmailInput] = useState("");

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    if (emailQuery) params.set("email", emailQuery);
    fetch(`/api/admin/coin-log?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.logs ?? []);
        setTotal(d.total ?? 0);
      });
  }, [page, emailQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">调币流水</h1>
        <p className="mt-1 text-sm text-ink-muted">
          所有 admin 手动调整 T-Coin 的记录（含 admin / 数量 / 原因 / 调前调后余额）
        </p>
      </div>

      <div className="relative max-w-sm">
        <input
          placeholder="按用户邮箱模糊搜索..."
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setPage(1);
              setEmailQuery(emailInput.trim());
            }
          }}
          className="w-full rounded-lg border border-hairline bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-accent text-ink placeholder:text-ink-subtle"
        />
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
        {emailQuery && (
          <button
            onClick={() => {
              setEmailInput("");
              setEmailQuery("");
              setPage(1);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-xs text-ink-subtle hover:bg-canvas-alt hover:text-ink"
          >
            清除
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-hairline bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs text-ink-subtle">
              <th className="px-4 py-3 font-medium">时间</th>
              <th className="px-4 py-3 font-medium">被调币用户</th>
              <th className="px-4 py-3 font-medium">数量</th>
              <th className="px-4 py-3 font-medium">调前余额</th>
              <th className="px-4 py-3 font-medium">调后余额</th>
              <th className="px-4 py-3 font-medium">操作 admin</th>
              <th className="px-4 py-3 font-medium">原因</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-subtle">
                  暂无调币记录
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} className="border-b border-hairline tbl-row-stripe">
                  <td className="px-4 py-2.5 text-xs text-ink-subtle whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-4 py-2.5 text-ink">
                    {l.user.email}
                    {l.user.name && (
                      <span className="ml-1 text-xs text-ink-subtle">({l.user.name})</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-mono font-medium ${
                        l.amount > 0
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {l.amount > 0 ? "+" : ""}
                      {l.amount}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-ink-muted">
                    赠 {l.beforeGift} / 充 {l.beforePaid}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-ink-muted">
                    赠 {l.afterGift} / 充 {l.afterPaid}
                  </td>
                  <td className="px-4 py-2.5 text-ink-muted">
                    {l.admin.email}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-ink-muted max-w-xs truncate">
                    {l.reason ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-hairline px-3 py-1 text-sm text-ink disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-ink-muted">
            {page} / {totalPages}（共 {total} 条）
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-hairline px-3 py-1 text-sm text-ink disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}