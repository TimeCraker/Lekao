// ============================================
// Lekao · Admin 评论管理 (v2.2.0 #2)
// ============================================
// 按灵感过滤 + 搜索 + 软删（保留 banned 状态）

"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PressableButton } from "@/components/ui/pressable-button";
import {
  SearchIcon,
  TrashIcon,
  CommentIcon,
  LightbulbIcon,
} from "@/components/icons";

interface AdminComment {
  id: string;
  ideaId: string;
  ideaTitle: string;
  userEmail: string;
  content: string;
  status: "visible" | "banned";
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "visible", label: "正常" },
  { value: "banned", label: "已撤回" },
] as const;

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]["value"]>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, limit: "50" });
      if (search) params.set("q", search);
      const res = await fetch(`/api/admin/comments?${params}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setComments(data.comments);
      setTotal(data.total);
    } catch (e) {
      console.error("[admin comments] load error:", e);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const t = setTimeout(loadComments, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadComments, search]);

  async function handleDelete(comment: AdminComment) {
    if (comment.status === "banned") {
      alert("这条评论已被撤回");
      return;
    }
    if (
      !confirm(
        `确定撤回「${comment.userEmail}」的评论？\n撤回后该用户无法在此灵感下再次评论。`,
      )
    )
      return;
    if (busyId) return;
    setBusyId(comment.id);
    try {
      const res = await fetch(`/api/admin/comments/${comment.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "撤回失败");
        return;
      }
      setComments((prev) =>
        prev.map((c) => (c.id === comment.id ? { ...c, status: "banned" } : c)),
      );
    } catch (e) {
      console.error("[delete comment] error:", e);
      alert("网络错误");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink flex items-center gap-2">
            <CommentIcon className="w-6 h-6 text-accent-text" />
            评论管理
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            共 <span className="font-semibold text-ink">{total}</span> 条评论
          </p>
        </div>
        <PressableButton
          variant="ghost"
          size="sm"
          onClick={() => (window.location.href = "/admin/ideas")}
        >
          ← 灵感列表
        </PressableButton>
      </div>

      {/* 状态过滤 + 搜索 */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="inline-flex rounded-lg border border-hairline bg-white p-0.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                status === opt.value
                  ? "bg-accent-soft text-accent-text"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-ink-subtle pointer-events-none" />
          <input
            type="text"
            placeholder="搜索评论内容 / 邮箱..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-hairline rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition"
          />
        </div>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-sm text-ink-subtle text-center py-12">加载中…</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-hairline">
          <CommentIcon className="w-10 h-10 text-ink-subtle mx-auto mb-3" />
          <p className="text-sm text-ink-muted">
            {search ? `没找到包含 "${search}" 的评论` : "暂无评论"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {comments.map((c, i) => (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  delay: Math.min(i * 0.025, 0.2),
                  duration: 0.18,
                }}
                className={`bg-white border rounded-xl p-4 hover:shadow-md transition ${
                  c.status === "banned" ? "border-hairline/50 opacity-60" : "border-hairline"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* 灵感标题（点击跳前台） */}
                    <button
                      type="button"
                      onClick={() =>
                        (window.location.href = `/dashboard/ideas?focus=${c.ideaId}`)
                      }
                      className="inline-flex items-center gap-1 text-xs text-accent-text hover:text-accent-hover mb-1.5 transition"
                      title="查看灵感"
                    >
                      <LightbulbIcon className="w-3 h-3" />
                      {c.ideaTitle}
                    </button>

                    {/* 评论内容 */}
                    <p
                      className={`text-sm leading-relaxed mb-2 break-words ${
                        c.status === "banned"
                          ? "text-ink-subtle line-through italic"
                          : "text-ink"
                      }`}
                    >
                      {c.content}
                    </p>

                    {/* 元信息 */}
                    <div className="flex items-center gap-3 text-xs text-ink-subtle">
                      <span className="truncate max-w-[200px]" title={c.userEmail}>
                        {c.userEmail}
                      </span>
                      <span>·</span>
                      <span>{new Date(c.createdAt).toLocaleString("zh-CN")}</span>
                      {c.status === "banned" && (
                        <>
                          <span>·</span>
                          <span className="text-danger font-medium">已撤回</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 撤回按钮 */}
                  <div className="shrink-0">
                    <button
                      type="button"
                      disabled={busyId === c.id || c.status === "banned"}
                      onClick={() => handleDelete(c)}
                      className="inline-flex items-center justify-center p-1.5 text-ink-subtle hover:text-danger hover:bg-danger/5 rounded-md transition disabled:opacity-30 disabled:hover:text-ink-subtle disabled:hover:bg-transparent"
                      title={c.status === "banned" ? "已撤回" : "撤回评论"}
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