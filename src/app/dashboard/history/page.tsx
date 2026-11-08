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

// ============================================
// 云端 + 本地合并展示（2026-08-28 · cloud-history Stage）
// - 云端：lekao_class_summaries / lekao_class_feedbacks 只读（跨设备永久保存）
// - 本地：IndexedDB（仅本机，可删/清空）
// - 去重：同一生成双写两处 → 指纹（template+subject+topic+feedback 前 60 字）云端优先
// ============================================

const CLOUD_PAGE_LIMIT = 50;

type CloudRecord = {
  id: string;
  template: "summary" | "feedback";
  subject: string;
  topic: string;
  feedback: string;
  summary: string;
  createdAt: string;
};

type MergedRecord = {
  id: string;
  source: "cloud" | "local";
  template: "summary" | "feedback";
  subject: string;
  topic: string;
  feedback: string;
  summary: string;
  createdAt: string;
  className?: string;
  date?: string;
};

type CloudState = {
  records: CloudRecord[];
  total: number;
  page: number;
  loading: boolean;
};

function fingerprint(
  r: Pick<MergedRecord, "template" | "subject" | "topic" | "feedback">,
): string {
  return `${r.template}|${r.subject}|${r.topic}|${r.feedback.slice(0, 60)}`;
}

/** 云端 + 本地 → 时间倒序，指纹重复时云端优先 */
function mergeRecords(
  cloud: CloudRecord[],
  local: HistoryRecord[],
): MergedRecord[] {
  const seen = new Set<string>();
  const merged: MergedRecord[] = [];

  for (const c of cloud) {
    const fp = fingerprint(c);
    if (seen.has(fp)) continue;
    seen.add(fp);
    merged.push({ ...c, source: "cloud" });
  }
  for (const l of local) {
    const fp = fingerprint(l);
    if (seen.has(fp)) continue;
    seen.add(fp);
    merged.push({
      id: l.id,
      source: "local",
      template: l.template,
      subject: l.subject,
      topic: l.topic,
      feedback: l.feedback,
      summary: l.summary,
      createdAt: l.createdAt,
      className: l.className,
      date: l.date,
    });
  }

  merged.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return merged;
}

export default function HistoryPage() {
  const { data: session } = useSession();
  const userKey = session?.user?.email ?? "";
  const [localRecords, setLocalRecords] = useState<HistoryRecord[]>([]);
  const [cloud, setCloud] = useState<CloudState>({
    records: [],
    total: 0,
    page: 1,
    loading: true,
  });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadCloudPage = useCallback(async (page: number) => {
    setCloud((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch(
        `/api/lekao/history?page=${page}&limit=${CLOUD_PAGE_LIMIT}`,
      );
      if (!res.ok) return; // 云端不可用 → 静默降级为仅本地
      const data = (await res.json()) as {
        summaries: CloudRecord[];
        feedbacks: CloudRecord[];
        summaryTotal: number;
        feedbackTotal: number;
      };
      const pageRecords = [...data.summaries, ...data.feedbacks];
      setCloud((prev) => ({
        records: page === 1 ? pageRecords : [...prev.records, ...pageRecords],
        total: data.summaryTotal + data.feedbackTotal,
        page,
        loading: false,
      }));
    } catch {
      setCloud((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const load = useCallback(async () => {
    if (!userKey) return;
    setLoading(true);
    // IndexedDB 不可用（如隐私模式）→ 静默降级为空
    const localTask = getHistory(userKey).catch(() => [] as HistoryRecord[]);
    await Promise.all([localTask.then(setLocalRecords), loadCloudPage(1)]);
    setLoading(false);
  }, [userKey, loadCloudPage]);

  useEffect(() => {
    // setTimeout 调度：load 内同步 setState（setLoading）不在 effect body 直接执行
    const t = setTimeout(() => {
      if (userKey) void load();
    }, 0);
    return () => clearTimeout(t);
  }, [userKey, load]);

  const cloudHasMore = cloud.records.length < cloud.total;

  const handleDelete = async (id: string) => {
    await deleteGeneration(id);
    setLocalRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const handleClear = async () => {
    if (!confirm("确定清空所有本机历史记录？（云端保存的记录不受影响）"))
      return;
    await clearHistory(userKey);
    setLocalRecords([]);
  };

  const merged = mergeRecords(cloud.records, localRecords);
  const localCount = merged.filter((r) => r.source === "local").length;

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
        description="云端永久保存 + 本机记录合并展示（换设备也能看云端历史）"
      />

      <div className="px-8 md:px-12 py-8 max-w-4xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="w-6 h-6 border-2 border-hairline border-t-accent rounded-full animate-spin mb-3" />
            <span className="font-serif italic text-ink-muted">
              加载历史中…
            </span>
          </div>
        ) : merged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex items-center gap-3 mb-5 w-full max-w-xs">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-subtle">
                Empty
              </span>
              <span className="h-px flex-1 bg-hairline" />
            </div>
            <ClockIcon
              className="w-10 h-10 text-accent-text/60 mb-4"
              strokeWidth={1.25}
            />
            <p className="font-serif text-xl font-semibold text-ink mb-2">
              暂无历史记录
            </p>
            <p className="text-sm text-ink-muted max-w-xs">
              每次生成小结或反馈后，结果会自动保存在这里。
            </p>
            <Link
              href="/dashboard/summary"
              className="mt-6 inline-flex items-center gap-1.5 px-5 py-2.5 bg-accent-text text-white text-sm font-medium rounded-xl hover:bg-accent-hover transition"
            >
              去生成第一条
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-ink-muted">
                云端 {merged.length - localCount} 条 · 本机 {localCount} 条
              </p>
              {localCount > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-danger hover:text-danger-dark transition"
                >
                  清空本机记录
                </button>
              )}
            </div>

            <div className="space-y-3">
              {merged.map((r) => {
                const rowKey = `${r.source}-${r.id}`;
                const isOpen = expanded === rowKey;
                return (
                  <div
                    key={rowKey}
                    className="bg-white border border-hairline rounded-xl overflow-hidden"
                  >
                    {/* 摘要行 */}
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : rowKey)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-canvas-alt/50 transition"
                    >
                      <span
                        className={`shrink-0 inline-flex px-2 py-0.5 text-xs font-semibold rounded font-mono uppercase tracking-wider ${
                          r.template === "summary"
                            ? "bg-accent-soft text-accent-ink"
                            : "bg-success-soft text-success-text"
                        }`}
                      >
                        {templateLabel[r.template]}
                      </span>
                      {/* 来源徽章：云端永久保存 / 仅本机 */}
                      {r.source === "cloud" ? (
                        <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded bg-success-soft/60 text-success-text border border-success-text/20">
                          永久保存
                        </span>
                      ) : (
                        <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-canvas-alt text-ink-subtle border border-hairline">
                          仅本机
                        </span>
                      )}
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
                          {r.className && (
                            <div className="text-xs text-ink-muted">
                              <span className="font-medium">班级：</span>
                              {r.className}
                              <span className="mx-2">·</span>
                              <span className="font-medium">日期：</span>
                              {r.date}
                            </div>
                          )}

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

                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-[10px] text-ink-subtle">
                            {r.source === "cloud"
                              ? "云端记录 · 换设备可见"
                              : "本机记录 · 清除浏览器数据会丢失"}
                          </span>
                          {r.source === "local" && (
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
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 云端分页加载更多 */}
            {cloudHasMore && (
              <button
                type="button"
                onClick={() => loadCloudPage(cloud.page + 1)}
                disabled={cloud.loading}
                className="mt-4 w-full py-2.5 text-sm text-ink-muted hover:text-ink border border-hairline rounded-xl hover:bg-canvas-alt/50 transition disabled:opacity-50"
              >
                {cloud.loading
                  ? "加载中…"
                  : `加载更多云端记录（还有 ${cloud.total - cloud.records.length} 条）`}
              </button>
            )}
          </>
        )}

        <div className="mt-8 pt-6 border-t border-hairline">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 py-1 -my-1 text-sm text-ink-muted hover:text-ink transition"
          >
            ← 返回控制台
          </Link>
        </div>
      </div>
    </>
  );
}
