"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";

interface AuditLog {
  id: string;
  adminId: string;
  targetUserId: string | null;
  action: string;
  details: string | null;
  ip: string | null;
  createdAt: string;
  admin: { email: string; name: string | null };
  targetUser: { email: string; name: string | null } | null;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  tcoin_adjust: { label: "调币", color: "bg-warning-soft text-warning-text" },
  user_update: { label: "改资料", color: "bg-accent-soft text-accent-ink" },
  user_ban: { label: "封禁", color: "bg-danger-soft text-danger-text" },
  user_unban: { label: "解封", color: "bg-success-soft text-success-text" },
  invite_create: {
    label: "生成邀请码",
    color: "bg-annotation-soft text-annotation-text",
  },
  // v2.2.0 灵感墙新增 3 个
  idea_status_change: {
    label: "改灵感状态",
    color: "bg-accent-soft text-accent-ink",
  },
  idea_delete: { label: "删除灵感", color: "bg-danger-soft text-danger-text" },
  idea_comment_delete: {
    label: "删除评论",
    color: "bg-danger-soft text-danger-text",
  },
};

function actionMeta(a: string) {
  return (
    ACTION_LABELS[a] ?? { label: a, color: "bg-canvas-alt text-ink-muted" }
  );
}

function formatDetails(d: string | null): string {
  if (!d) return "—";
  try {
    const obj = JSON.parse(d);
    // 简化：把所有键值打印
    return Object.entries(obj)
      .map(([k, v]) => {
        if (k === "changes" && typeof v === "object" && v) {
          const c = Object.entries(
            v as Record<string, { from: unknown; to: unknown }>,
          )
            .map(
              ([fk, fv]) =>
                `${fk}: ${JSON.stringify(fv.from)} → ${JSON.stringify(fv.to)}`,
            )
            .join("; ");
          return `${k}: { ${c} }`;
        }
        return `${k}: ${JSON.stringify(v)}`;
      })
      .join("\n");
  } catch {
    return d;
  }
}

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    if (actionFilter) params.set("action", actionFilter);
    fetch(`/api/admin/audit-log?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.logs ?? []);
        setTotal(d.total ?? 0);
      });
  }, [page, actionFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-ink">审计日志</h1>
        <p className="mt-1 text-sm text-ink-muted">
          所有 admin 在后台的写操作记录（调币 / 改资料 / 封禁 / 生成邀请码...）
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-muted">按操作类型：</span>
        {[
          { v: "", l: "全部" },
          { v: "tcoin_adjust", l: "调币" },
          { v: "user_update", l: "改资料" },
          { v: "user_ban", l: "封禁" },
          { v: "user_unban", l: "解封" },
          { v: "invite_create", l: "邀请码" },
          { v: "idea_status_change", l: "改灵感状态" },
          { v: "idea_delete", l: "删除灵感" },
          { v: "idea_comment_delete", l: "删除评论" },
        ].map((opt) => (
          <button
            key={opt.v}
            onClick={() => {
              setActionFilter(opt.v);
              setPage(1);
            }}
            className={`relative rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              actionFilter === opt.v
                ? "text-white"
                : "border border-hairline text-ink-muted hover:text-ink"
            }`}
          >
            {actionFilter === opt.v && (
              <motion.span
                layoutId="audit-action-indicator"
                className="absolute inset-0 rounded-full bg-accent-text -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            {opt.l}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-hairline bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs text-ink-subtle">
              <th className="px-4 py-3 font-medium">时间</th>
              <th className="px-4 py-3 font-medium">操作</th>
              <th className="px-4 py-3 font-medium">admin</th>
              <th className="px-4 py-3 font-medium">目标用户</th>
              <th className="px-4 py-3 font-medium">详情</th>
              <th className="px-4 py-3 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-ink-subtle"
                >
                  暂无审计记录
                </td>
              </tr>
            ) : (
              logs.map((l) => {
                const meta = actionMeta(l.action);
                return (
                  <tr
                    key={l.id}
                    className="border-b border-hairline tbl-row-stripe"
                  >
                    <td className="px-4 py-2.5 text-xs text-ink-subtle whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${meta.color}`}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">
                      <span
                        className="block max-w-[200px] truncate"
                        title={l.admin.email}
                      >
                        {l.admin.email}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">
                      {l.targetUser ? (
                        <span
                          className="block max-w-[200px] truncate"
                          title={l.targetUser.email}
                        >
                          {l.targetUser.email}
                        </span>
                      ) : (
                        <span className="text-ink-subtle">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-ink-muted">
                      <pre className="whitespace-pre-wrap break-words font-mono text-xs max-w-md">
                        {formatDetails(l.details)}
                      </pre>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-ink-subtle font-mono">
                      {l.ip ?? "—"}
                    </td>
                  </tr>
                );
              })
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
