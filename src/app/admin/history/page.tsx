"use client";

import { useState, useEffect, useCallback } from "react";
import { DocumentIcon, SearchIcon } from "@/components/icons";

type ContentType = "all" | "summary" | "feedback";

interface HistoryItem {
  id: string;
  type: "summary" | "feedback";
  content: string;
  user: { email: string; name: string | null } | null;
  createdAt: string;
  subject?: string;
  tags?: string;
}

export default function AdminHistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState<ContentType>("all");
  const [userId, setUserId] = useState("");
  const limit = 20;

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (type !== "all") params.set("type", type);
    if (userId.trim()) params.set("userId", userId.trim());
    fetch(`/api/admin/history?${params}`)
      .then((r) => r.json())
      .then((d) => {
        const combined: HistoryItem[] = [
          ...(d.summaries ?? []).map((s: any) => ({ ...s, type: "summary" as const })),
          ...(d.feedbacks ?? []).map((f: any) => ({ ...f, type: "feedback" as const })),
        ];
        combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setItems(combined);
        setTotal(Math.max(d.summaryTotal ?? 0, d.feedbackTotal ?? 0));
      });
  }, [page, type, userId]);

  useEffect(() => {
    load();
  }, [load]);

  function typeLabel(t: ContentType) {
    return t === "all" ? "全部" : t === "summary" ? "课堂小结" : "堂测反馈";
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">内容历史</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-hairline overflow-hidden">
          {(["all", "summary", "feedback"] as ContentType[]).map((t) => (
            <button
              key={t}
              onClick={() => { setType(t); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                type === t
                  ? "bg-accent text-white"
                  : "bg-white text-ink-muted hover:bg-canvas-alt"
              }`}
            >
              {typeLabel(t)}
            </button>
          ))}
        </div>
        <div className="relative">
          <input
            placeholder="用户 ID"
            value={userId}
            onChange={(e) => { setUserId(e.target.value); setPage(1); }}
            className="w-48 rounded-lg border border-hairline bg-white py-1.5 pl-8 pr-3 text-xs outline-none text-ink placeholder:text-ink-subtle"
          />
          <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-subtle" />
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-subtle">暂无内容</p>
        ) : (
          items.map((item) => (
            <div key={`${item.type}-${item.id}`} className="rounded-xl border border-hairline bg-white p-4">
              <div className="mb-2 flex items-center gap-2">
                <DocumentIcon className="w-4 h-4 text-ink-subtle" />
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  item.type === "summary"
                    ? "bg-purple-50 text-purple-600"
                    : "bg-green-50 text-green-600"
                }`}>
                  {item.type === "summary" ? "课堂小结" : "堂测反馈"}
                </span>
                <span className="text-xs text-ink-muted">
                  {item.user
                    ? `${item.user.name || item.user.email}`
                    : "未知用户"}
                </span>
                <span className="ml-auto text-[10px] text-ink-subtle">
                  {new Date(item.createdAt).toLocaleString("zh-CN")}
                </span>
              </div>
              {item.subject && (
                <p className="mb-1 text-xs text-ink-muted">
                  课题: {item.subject}
                </p>
              )}
              <p className="text-sm text-ink line-clamp-3 whitespace-pre-wrap">
                {item.content}
              </p>
              {item.tags && (
                <div className="mt-1">
                  <span className="rounded bg-canvas-alt px-1.5 py-0.5 text-[10px] text-ink-subtle">
                    {item.tags}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-hairline px-3 py-1 text-sm text-ink disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-ink-muted">
            {page} / {Math.ceil(total / limit)}
          </span>
          <button
            disabled={page >= Math.ceil(total / limit)}
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
