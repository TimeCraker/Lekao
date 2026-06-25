// ============================================
// Lekao · 灵感墙 · 评论组件 (v2.2.0)
// ============================================
// 决策 #10：每用户对每个灵感最多 1 条 visible 评论
// 删了 → status='banned' → UI 显示 "你已撤回评论" 占位
// 敏感词实时提示 + 提交后清空

"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PressableButton } from "@/components/ui/pressable-button";
import { SuccessBurst } from "@/components/ui/success-burst";
import { TrashIcon, XIcon, ChevronDownIcon } from "@/components/icons";
import { findSensitiveWords } from "@/lib/sensitive-words";

export interface IdeaComment {
  id: string;
  ideaId: string;
  userId: string;
  userEmail: string;
  content: string;
  createdAt: string;
  myOwn: boolean;
}

interface IdeaCommentsProps {
  ideaId: string;
  initialComments: IdeaComment[];
  initialBanned: boolean; // 当前用户对此灵感是否已 banned（删过评论）
  onCountChange: (newCount: number) => void;
  onClose?: () => void;
}

const CONTENT_MAX = 200;

export function IdeaComments({
  ideaId,
  initialComments,
  initialBanned,
  onCountChange,
  onClose,
}: IdeaCommentsProps) {
  const [comments, setComments] = useState<IdeaComment[]>(initialComments);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sensitiveHits, setSensitiveHits] = useState<string[]>([]);
  const [banned, setBanned] = useState(initialBanned);
  const [burst, setBurst] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 同步父组件传入的 initialBanned（切换灵感时更新）
  useEffect(() => {
    setBanned(initialBanned);
    setComments(initialComments);
    setError(null);
  }, [ideaId, initialBanned, initialComments]);

  // 敏感词实时检测
  useEffect(() => {
    setSensitiveHits(findSensitiveWords(content));
  }, [content]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/lekao/ideas/${ideaId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "提交失败");
        if (data.error?.includes("撤回") || data.error?.includes("评论过")) {
          setBanned(true);
        }
        return;
      }
      setComments((prev) => [...prev, data.comment]);
      setContent("");
      setBanned(true); // 提交成功后也标记 banned（防止 race 二次提交）
      onCountChange(comments.length + 1);
      setBurst(true);
      setTimeout(() => setBurst(false), 700);
    } catch (e) {
      console.error("[comments submit] error:", e);
      setError("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (deletingId) return;
    if (!confirm("删除评论后无法再次评论，确定要撤回吗？")) return;
    setDeletingId(commentId);
    try {
      const res = await fetch(
        `/api/lekao/ideas/${ideaId}/comments/${commentId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "删除失败");
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onCountChange(comments.length - 1);
      setBanned(true); // 标记为 banned，UI 切换到占位
    } catch (e) {
      console.error("[comments delete] error:", e);
      alert("网络错误，请重试");
    } finally {
      setDeletingId(null);
    }
  }

  function formatTime(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "刚刚";
    if (diffMin < 60) return `${diffMin} 分钟前`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} 小时前`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD} 天前`;
    return date.toLocaleDateString("zh-CN");
  }

  return (
    <div className="border-t border-hairline pt-3 mt-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-ink-muted">
          💬 {comments.length} 条评论
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-ink-subtle hover:text-ink p-1"
            aria-label="收起评论"
          >
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 评论列表 */}
      <div className="space-y-2 mb-3">
        <AnimatePresence initial={false}>
          {comments.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2 text-sm bg-canvas-alt/50 rounded-lg px-3 py-2"
            >
              <span className="text-ink-mute truncate shrink-0 max-w-[140px]" title={c.userEmail}>
                {c.userEmail}
              </span>
              <span className="text-ink-subtle shrink-0">·</span>
              <span className="text-ink-muted shrink-0">{formatTime(c.createdAt)}</span>
              <span className="flex-1 text-ink leading-relaxed break-words">
                {c.content}
              </span>
              {c.myOwn && (
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  disabled={deletingId === c.id}
                  className="shrink-0 text-ink-subtle hover:text-danger disabled:opacity-50 transition"
                  title="撤回评论"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 输入区 / 已撤回占位 */}
      {banned ? (
        <div className="text-xs text-ink-subtle italic px-3 py-2 bg-canvas-alt/30 rounded-lg">
          你已撤回评论 ✋
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setError(null);
              }}
              placeholder="说点什么吧…"
              maxLength={CONTENT_MAX}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-white border border-hairline rounded-lg resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition"
            />
            <div className="absolute bottom-2 right-2 text-xs text-ink-subtle pointer-events-none">
              {content.length}/{CONTENT_MAX}
            </div>
          </div>

          {/* 敏感词提示 */}
          {sensitiveHits.length > 0 && (
            <div className="text-xs text-danger px-1">
              ⚠️ 含敏感词：{sensitiveHits.join("、")}
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="text-xs text-danger px-1">{error}</div>
          )}

          <div className="flex justify-end relative">
            <SuccessBurst show={burst} />
            <PressableButton
              type="submit"
              size="sm"
              variant="primary"
              loading={submitting}
              disabled={!content.trim() || sensitiveHits.length > 0}
            >
              📤 发送
            </PressableButton>
          </div>
        </form>
      )}
    </div>
  );
}