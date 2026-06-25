// ============================================
// Lekao · 灵感墙 · 主列表组件 (v2.2.0)
// ============================================
// 单卡片渲染：标题 + 描述 + 邮箱 + 状态 + 点赞按钮 + 评论展开
// 乐观更新 like / delete / comment count（无需 await 反馈）
// 包含展开的 comments 区域（lazy 加载）

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PressableButton } from "@/components/ui/pressable-button";
import { SuccessBurst } from "@/components/ui/success-burst";
import { ThumbsUpIcon, CommentIcon, TrashIcon, ChevronDownIcon } from "@/components/icons";
import { IdeaComments, type IdeaComment } from "./idea-comments";

export interface Idea {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  description: string;
  status: "open" | "planned" | "done";
  createdAt: string;
  likeCount: number;
  commentCount: number;
  myLiked: boolean;
  myOwn: boolean;
}

interface IdeasListProps {
  ideas: Idea[];
  onUpdate: (ideas: Idea[]) => void;
  onTotalChange: (total: number) => void;
}

const STATUS_LABEL: Record<Idea["status"], { label: string; cls: string }> = {
  open: { label: "待规划", cls: "bg-canvas-alt text-ink-muted border-hairline" },
  planned: { label: "规划中", cls: "bg-accent-soft text-accent-ink border-accent/20" },
  done: { label: "已上线", cls: "bg-success-soft text-success-text border-success/20" },
};

export function IdeasList({ ideas, onUpdate, onTotalChange }: IdeasListProps) {
  async function handleLike(ideaId: string) {
    const idea = ideas.find((i) => i.id === ideaId);
    if (!idea) return;
    // 乐观更新
    const optimistic = ideas.map((i) =>
      i.id === ideaId
        ? {
            ...i,
            myLiked: !i.myLiked,
            likeCount: i.likeCount + (i.myLiked ? -1 : 1),
          }
        : i,
    );
    onUpdate(optimistic);

    try {
      const res = await fetch(`/api/lekao/ideas/${ideaId}/like`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("like failed");
      const data = await res.json();
      // 用服务端真实值校正
      const synced = optimistic.map((i) =>
        i.id === ideaId ? { ...i, myLiked: data.liked, likeCount: data.count } : i,
      );
      onUpdate(synced);
    } catch (e) {
      console.error("[like] error:", e);
      // 回滚
      onUpdate(ideas);
      alert("点赞失败，请重试");
    }
  }

  async function handleDelete(ideaId: string) {
    if (!confirm("删除灵感后无法恢复，确定吗？")) return;
    try {
      const res = await fetch(`/api/lekao/ideas/${ideaId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "删除失败");
        return;
      }
      const filtered = ideas.filter((i) => i.id !== ideaId);
      onUpdate(filtered);
      onTotalChange(filtered.length);
    } catch (e) {
      console.error("[delete idea] error:", e);
      alert("网络错误，请重试");
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
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {ideas.map((idea, i) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            index={i}
            onLike={() => handleLike(idea.id)}
            onDelete={() => handleDelete(idea.id)}
            onUpdateCount={(delta) => {
              const updated = ideas.map((x) =>
                x.id === idea.id ? { ...x, commentCount: x.commentCount + delta } : x,
              );
              onUpdate(updated);
            }}
            formatTime={formatTime}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// 单卡片
// ============================================
interface IdeaCardProps {
  idea: Idea;
  index: number;
  onLike: () => void;
  onDelete: () => void;
  onUpdateCount: (delta: number) => void;
  formatTime: (iso: string) => string;
}

function IdeaCard({ idea, index, onLike, onDelete, onUpdateCount, formatTime }: IdeaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<IdeaComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [banned, setBanned] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [likeBurst, setLikeBurst] = useState(false);

  async function toggleComments() {
    if (!expanded) {
      setExpanded(true);
      if (!loaded) {
        setLoadingComments(true);
        try {
          const res = await fetch(`/api/lekao/ideas/${idea.id}/comments`);
          if (res.ok) {
            const data = await res.json();
            setComments(data.comments);
            setBanned(data.banned ?? false);
            setLoaded(true);
          }
        } catch (e) {
          console.error("[load comments] error:", e);
        } finally {
          setLoadingComments(false);
        }
      }
    } else {
      setExpanded(false);
    }
  }

  const statusInfo = STATUS_LABEL[idea.status];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        delay: Math.min(index * 0.04, 0.3),
        type: "spring",
        stiffness: 260,
        damping: 24,
      }}
      className={`group bg-white border rounded-2xl p-5 transition-all hover:shadow-md ${
        idea.myOwn ? "border-accent/30 bg-accent-soft/10" : "border-hairline"
      }`}
    >
      {/* 顶部：标题 + 状态 */}
      <div className="flex items-start gap-3 mb-2">
        <h3 className="flex-1 text-base font-semibold text-ink leading-snug">
          {idea.title}
        </h3>
        <span
          className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full border ${statusInfo.cls}`}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* 描述 */}
      <p className="text-sm text-ink-muted leading-relaxed mb-3 line-clamp-3">
        {idea.description}
      </p>

      {/* 元信息栏 */}
      <div className="flex items-center justify-between pt-3 border-t border-hairline/60">
        <span className="text-xs text-ink-subtle truncate" title={idea.userEmail}>
          {idea.userEmail} · {formatTime(idea.createdAt)}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {/* 点赞按钮 */}
          <div className="relative">
            <SuccessBurst show={likeBurst} distance={16} count={4} />
            <button
              type="button"
              onClick={() => {
                onLike();
                if (!idea.myLiked) {
                  setLikeBurst(true);
                  setTimeout(() => setLikeBurst(false), 600);
                }
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition ${
                idea.myLiked
                  ? "bg-accent-soft text-accent-ink"
                  : "text-ink-muted hover:bg-canvas-alt hover:text-ink"
              }`}
            >
              <ThumbsUpIcon
                className={`w-3.5 h-3.5 ${idea.myLiked ? "fill-accent-text" : ""}`}
              />
              {idea.likeCount}
            </button>
          </div>

          {/* 评论按钮 */}
          <button
            type="button"
            onClick={toggleComments}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition ${
              expanded
                ? "bg-canvas-alt text-ink"
                : "text-ink-muted hover:bg-canvas-alt hover:text-ink"
            }`}
          >
            <CommentIcon className="w-3.5 h-3.5" />
            {idea.commentCount}
          </button>

          {/* 删除（仅自己） */}
          {idea.myOwn && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center justify-center p-1.5 text-ink-subtle hover:text-danger hover:bg-danger/5 rounded-md transition"
              title="删除灵感"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 评论区 */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {loadingComments ? (
              <div className="text-xs text-ink-subtle italic py-3">加载评论中…</div>
            ) : (
              <IdeaComments
                ideaId={idea.id}
                initialComments={comments}
                initialBanned={banned}
                onCountChange={(newCount) => {
                  const delta = newCount - idea.commentCount;
                  onUpdateCount(delta);
                }}
                onClose={() => setExpanded(false)}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}