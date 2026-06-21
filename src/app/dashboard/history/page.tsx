"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { TopBar } from "@/components/dashboard/sidebar";
import { TrashIcon, ClockIcon } from "@/components/icons";
import {
  getHistory,
  deleteGeneration,
  clearHistory,
  type HistoryRecord,
} from "@/lib/storage/local-history";

export default function HistoryPage() {
  const { data: session } = useSession();
  const userKey = session?.user?.email ?? "";
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userKey) return;
    setLoading(true);
    try {
      const data = await getHistory(userKey);
      setRecords(data);
    } catch {
      // IndexedDB 不可用（如隐私模式）
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [userKey]);

  useEffect(() => {
    if (userKey) load();
  }, [userKey, load]);

  const handleDelete = async (id: string) => {
    await deleteGeneration(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const handleClear = async () => {
    if (!confirm("确定清空所有本地历史记录？此操作不可撤销。")) return;
    await clearHistory(userKey);
    setRecords([]);
  };

  const templateLabel: Record<string, string> = {
    summary: "课堂小结",
    feedback: "作业/堂测反馈",
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <>
      <TopBar
        title="生成历史"
        description="本地保存的历史生成记录（仅当前浏览器可见）"
      />

      <div className="px-8 md:px-12 py-8 max-w-4xl">
        {loading ? (
          <div className="text-center py-16 text-ink-muted">加载中...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-16">
            <ClockIcon className="w-12 h-12 mx-auto text-ink-subtle mb-4" />
            <p className="text-ink-muted">暂无历史记录</p>
            <p className="text-ink-subtle text-sm mt-1">
              每次生成小结或反馈后，结果会自动保存在这里
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-ink-muted">
                共 {records.length} 条记录
              </p>
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-danger hover:text-danger-dark transition"
              >
                清空全部
              </button>
            </div>

            <div className="space-y-3">
              {records.map((r) => {
                const isOpen = expanded === r.id;
                return (
                  <div
                    key={r.id}
                    className="bg-white border border-hairline rounded-xl overflow-hidden"
                  >
                    {/* 摘要行 */}
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : r.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-canvas-alt/50 transition"
                    >
                      <span
                        className={`shrink-0 inline-flex px-2 py-0.5 text-xs font-semibold rounded ${
                          r.template === "summary"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {templateLabel[r.template]}
                      </span>
                      <span className="text-sm text-ink-muted shrink-0 w-32">
                        {formatTime(r.createdAt)}
                      </span>
                      <span className="text-sm text-ink truncate min-w-0">
                        {r.subject}
                        {r.topic ? ` · ${r.topic}` : ""}
                      </span>
                      <span className="ml-auto text-xs text-ink-subtle shrink-0">
                        {isOpen ? "收起" : "查看"}
                      </span>
                    </button>

                    {/* 展开详情 */}
                    {isOpen && (
                      <div className="px-4 pb-4 border-t border-hairline">
                        <div className="mt-3 space-y-3">
                          <div className="text-xs text-ink-muted">
                            <span className="font-medium">班级：</span>
                            {r.className}
                            <span className="mx-2">·</span>
                            <span className="font-medium">日期：</span>
                            {r.date}
                          </div>

                          {r.feedback && (
                            <div>
                              <div className="text-xs font-semibold text-ink-muted mb-1">
                                {templateLabel[r.template]}内容
                              </div>
                              <pre className="text-sm text-ink whitespace-pre-wrap bg-canvas rounded-lg p-3 max-h-80 overflow-y-auto">
                                {r.feedback}
                              </pre>
                            </div>
                          )}

                          {r.summary && (
                            <div>
                              <div className="text-xs font-semibold text-ink-muted mb-1">
                                总体小结
                              </div>
                              <pre className="text-sm text-ink whitespace-pre-wrap bg-canvas rounded-lg p-3 max-h-60 overflow-y-auto">
                                {r.summary}
                              </pre>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(r.id);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-danger transition"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                            删除
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-8 pt-6 border-t border-hairline">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition"
          >
            ← 返回控制台
          </Link>
        </div>
      </div>
    </>
  );
}
