// ============================================
// Lekao · Admin 灵感墙列表 (v2.2.0 #2)
// ============================================
// 状态过滤 + 搜索 + 改状态 + 删除（带审计）

"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PressableButton } from "@/components/ui/pressable-button";
import { SuccessBurst } from "@/components/ui/success-burst";
import {
  SearchIcon,
  TrashIcon,
  LightbulbIcon,
  ThumbsUpIcon,
  CommentIcon,
} from "@/components/icons";

interface AdminIdea {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  description: string;
  status: "open" | "planned" | "done";
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "open", label: "待规划" },
  { value: "planned", label: "规划中" },
  { value: "done", label: "已上线" },
] as const;

const STATUS_LABEL: Record<AdminIdea["status"], string> = {
  open: "待规划",
  planned: "规划中",
  done: "已上线",
};

const STATUS_NEXT: Record<AdminIdea["status"], AdminIdea["status"]> = {
  open: "planned",
  planned: "done",
  done: "open",
};

export default function AdminIdeasPage() {
  const [ideas, setIdeas] = useState<AdminIdea[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] =
    useState<(typeof STATUS_OPTIONS)[number]["value"]>("all");
  const [burstId, setBurstId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadIdeas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, limit: "50" });
      if (search) params.set("q", search);
      const res = await fetch(`/api/admin/ideas?${params}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setIdeas(data.ideas);
      setTotal(data.total);
    } catch (e) {
      console.error("[admin ideas] load error:", e);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const t = setTimeout(loadIdeas, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadIdeas, search]);

  async function handleStatusChange(idea: AdminIdea) {
    const next = STATUS_NEXT[idea.status];
    if (busyId) return;
    setBusyId(idea.id);
    try {
      const res = await fetch(`/api/admin/ideas/${idea.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "状态更新失败");
        return;
      }
      setIdeas((prev) =>
        prev.map((i) => (i.id === idea.id ? { ...i, status: next } : i)),
      );
      setBurstId(idea.id);
      setTimeout(() => setBurstId(null), 600);
    } catch (e) {
      console.error("[status change] error:", e);
      alert("网络错误");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(idea: AdminIdea) {
    if (
      !confirm(
        `确定删除灵感「${idea.title}」？\n此操作会同时删除 ${idea.likeCount} 个点赞和 ${idea.commentCount} 条评论，且不可恢复。`,
      )
    )
      return;
    if (busyId) return;
    setBusyId(idea.id);
    try {
      const res = await fetch(`/api/admin/ideas/${idea.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "删除失败");
        return;
      }
      setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      console.error("[delete idea] error:", e);
      alert("网络错误");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 标题栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-ink flex items-center gap-2">
            <LightbulbIcon className="w-5 h-5 sm:w-6 sm:h-6 text-accent-text" />
            灵感墙管理
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            共 <span className="font-semibold text-ink">{total}</span> 条灵感
          </p>
        </div>
        <PressableButton
          variant="ghost"
          size="sm"
          onClick={() => (window.location.href = "/dashboard/ideas")}
        >
          <span className="hidden sm:inline">查看前台页面 →</span>
          <span className="sm:hidden">前台 →</span>
        </PressableButton>
      </div>

      {/* 状态过滤 + 搜索 */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Tab 过滤（移动端横滑） */}
        <div className="inline-flex rounded-lg border border-hairline bg-white p-0.5 overflow-x-auto shrink-0">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-md transition ${
                status === opt.value
                  ? "bg-accent-soft text-accent-text"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 搜索 */}
        <div className="relative flex-1 sm:max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-ink-subtle pointer-events-none" />
          <input
            aria-label="搜索灵感反馈"
            type="text"
            placeholder="搜索标题 / 描述 / 邮箱..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-hairline rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition"
          />
        </div>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-sm text-ink-subtle text-center py-12">加载中…</div>
      ) : ideas.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-hairline">
          <LightbulbIcon className="w-10 h-10 text-ink-subtle mx-auto mb-3" />
          <p className="text-sm text-ink-muted">
            {search ? `没找到包含 "${search}" 的灵感` : "暂无灵感"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {ideas.map((idea, i) => (
              <motion.div
                key={idea.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  delay: Math.min(i * 0.025, 0.2),
                  duration: 0.18,
                }}
                className="bg-white border border-hairline rounded-xl p-3 sm:p-4 hover:shadow-md transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
                  {/* 左侧信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1.5">
                      <h3 className="flex-1 text-sm font-semibold text-ink leading-snug">
                        {idea.title}
                      </h3>
                      <span
                        className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${
                          idea.status === "open"
                            ? "bg-canvas-alt text-ink-muted"
                            : idea.status === "planned"
                              ? "bg-accent-soft text-accent-ink"
                              : "bg-success-soft text-success-text"
                        }`}
                      >
                        {STATUS_LABEL[idea.status]}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted leading-relaxed line-clamp-2 mb-2">
                      {idea.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-subtle">
                      <span
                        className="truncate max-w-[200px]"
                        title={idea.userEmail}
                      >
                        {idea.userEmail}
                      </span>
                      <span className="hidden sm:inline">·</span>
                      <span>
                        {new Date(idea.createdAt).toLocaleString("zh-CN")}
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <ThumbsUpIcon className="w-3 h-3" />
                        {idea.likeCount}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CommentIcon className="w-3 h-3" />
                        {idea.commentCount}
                      </span>
                    </div>
                  </div>

                  {/* 右侧操作（移动端：底部 border-top 分隔） */}
                  <div className="shrink-0 flex items-center gap-1 sm:gap-2 relative sm:pt-0 pt-2 border-t sm:border-t-0 border-hairline/60">
                    <SuccessBurst
                      show={burstId === idea.id}
                      distance={20}
                      count={5}
                    />
                    <PressableButton
                      variant="ghost"
                      size="sm"
                      loading={busyId === idea.id}
                      onClick={() => handleStatusChange(idea)}
                      title={`切换到 ${STATUS_LABEL[STATUS_NEXT[idea.status]]}`}
                    >
                      <span className="hidden sm:inline">
                        → {STATUS_LABEL[STATUS_NEXT[idea.status]]}
                      </span>
                      <span className="sm:hidden">
                        → {STATUS_NEXT[idea.status]}
                      </span>
                    </PressableButton>
                    <button
                      type="button"
                      disabled={busyId === idea.id}
                      onClick={() => handleDelete(idea)}
                      className="inline-flex items-center justify-center p-2 sm:p-1.5 text-ink-subtle hover:text-danger hover:bg-danger/5 rounded-md transition disabled:opacity-50"
                      title="删除灵感"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
