"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { useDialogA11y } from "@/lib/hooks/dialog-a11y";
import { DURATION_BASE, EASE_PUBLICATION } from "@/lib/motion-tokens";
import { TrashIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * 应用内确认弹窗（危险操作二次确认 · DESIGN.md §7）
 * - Portal + useDialogA11y（焦点陷阱 / Esc / 焦点归还）+ 双通道开合动画
 * - 首发消费方：灵感墙删除确认（2026-09-29 替代原生 confirm()）
 */
type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 危险操作态：红色实底确认钮 + 警示图标 */
  danger?: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  danger = false,
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  const close = () => {
    if (!loading) onClose();
  };
  // 焦点陷阱 + Esc + 焦点归还（复用既有 a11y 钩子，同 usage-guide/idea-submit 范式）
  const dialogRef = useDialogA11y({ open, onClose: close });

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* 遮罩 */}
          <button
            type="button"
            aria-label="关闭"
            onClick={close}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm cursor-default"
          />

          {/* 确认卡 */}
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{
              duration: DURATION_BASE / 1000,
              ease: EASE_PUBLICATION,
            }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 focus:outline-none"
          >
            <div className="flex items-start gap-3">
              {danger && (
                <div className="shrink-0 w-10 h-10 rounded-full bg-danger-soft flex items-center justify-center">
                  <TrashIcon className="w-5 h-5 text-danger-text" />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-ink">{title}</h2>
                <p className="text-sm text-ink-muted mt-1.5 leading-relaxed">
                  {description}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={close}
                className="flex-1 py-2.5 rounded-lg border border-hairline text-sm font-medium text-ink-mute hover:bg-canvas-alt hover:text-ink transition"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-60",
                  danger
                    ? "bg-danger-text hover:bg-danger"
                    : "bg-accent-text hover:bg-accent-hover",
                )}
              >
                {loading ? "处理中…" : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
