// ============================================
// Lekao · 灵感墙 · 提交弹窗组件 (v2.2.0)
// ============================================
// 响应式 dialog，移动端全屏
// 实时敏感词提示 + 长度计数 + 失败保留表单值

"use client";

import { useState, useEffect, useEffectEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PressableButton } from "@/components/ui/pressable-button";
import { SuccessBurst } from "@/components/ui/success-burst";
import { XIcon, LightbulbIcon } from "@/components/icons";
import { findSensitiveWords } from "@/lib/sensitive-words";

interface SubmitDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TITLE_MAX = 50;
const DESC_MAX = 500;

export function IdeaSubmitDialog({ open, onClose, onSuccess }: SubmitDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [burst, setBurst] = useState(false);
  const [titleHits, setTitleHits] = useState<string[]>([]);
  const [descHits, setDescHits] = useState<string[]>([]);

  // 关闭时清空（用 deferred 处理：先关闭动画再清空，避免动画过程中闪烁）
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setTitle("");
        setDescription("");
        setError(null);
        setTitleHits([]);
        setDescHits([]);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // 敏感词实时检测
  useEffect(() => {
    setTitleHits(findSensitiveWords(title));
  }, [title]);
  useEffect(() => {
    setDescHits(findSensitiveWords(description));
  }, [description]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!title.trim() || !description.trim()) {
      setError("标题和描述都不能为空");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/lekao/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "提交失败");
        return;
      }
      setBurst(true);
      setTimeout(() => setBurst(false), 700);
      onSuccess();
      onClose();
    } catch (e) {
      console.error("[submit idea] error:", e);
      setError("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  const hasSensitive = titleHits.length > 0 || descHits.length > 0;
  const canSubmit =
    title.trim().length > 0 &&
    title.length <= TITLE_MAX &&
    description.trim().length > 0 &&
    description.length <= DESC_MAX &&
    !hasSensitive;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative w-full max-w-lg md:max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
              <div className="flex items-center gap-2">
                <LightbulbIcon className="w-5 h-5 text-accent-text" />
                <h2 className="text-lg font-semibold text-ink">提个建议</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-ink-subtle hover:text-ink p-1"
                aria-label="关闭"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* 标题 */}
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  标题 <span className="text-danger">*</span>
                  <span className="text-ink-subtle font-normal ml-2">(≤ {TITLE_MAX} 字)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setError(null);
                    }}
                    maxLength={TITLE_MAX}
                    placeholder="一句话说清楚你想要啥功能"
                    className="w-full px-3 py-2 text-sm bg-white border border-hairline rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition"
                  />
                  <div className="absolute bottom-1.5 right-2 text-xs text-ink-subtle pointer-events-none">
                    {title.length}/{TITLE_MAX}
                  </div>
                </div>
                {titleHits.length > 0 && (
                  <div className="text-xs text-danger mt-1">
                    ⚠️ 含敏感词：{titleHits.join("、")}
                  </div>
                )}
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  描述 <span className="text-danger">*</span>
                  <span className="text-ink-subtle font-normal ml-2">(≤ {DESC_MAX} 字)</span>
                </label>
                <div className="relative">
                  <textarea
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setError(null);
                    }}
                    maxLength={DESC_MAX}
                    rows={5}
                    placeholder="详细说说使用场景、为什么想要这个功能…"
                    className="w-full px-3 py-2 text-sm bg-white border border-hairline rounded-lg resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition"
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-ink-subtle pointer-events-none">
                    {description.length}/{DESC_MAX}
                  </div>
                </div>
                {descHits.length > 0 && (
                  <div className="text-xs text-danger mt-1">
                    ⚠️ 含敏感词：{descHits.join("、")}
                  </div>
                )}
              </div>

              {/* 提示 + 错误 */}
              <div className="text-xs text-ink-subtle bg-canvas-alt/50 rounded-lg px-3 py-2 space-y-0.5">
                <div>💡 每人每天只能提 1 条</div>
                <div>📝 标题当天不能重复</div>
              </div>
              {error && (
                <div className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </form>

            {/* 操作栏 */}
            <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-hairline bg-canvas-alt/30">
              <PressableButton type="button" variant="ghost" size="md" onClick={onClose}>
                取消
              </PressableButton>
              <div className="relative">
                <SuccessBurst show={burst} />
                <PressableButton
                  type="button"
                  variant="primary"
                  size="md"
                  loading={submitting}
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                >
                  ✨ 提交
                </PressableButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}