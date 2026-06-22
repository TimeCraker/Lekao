"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useCopyState } from "@/lib/hooks/motion";

interface CopyButtonProps {
  text: string;
  className?: string;
  /** 按钮 idle 状态的文字 */
  children?: React.ReactNode;
}

/**
 * 复制按钮 · 点击后 0.8s 内显示 ✓，然后回到默认
 * - 复制成功 → 绿色 + ✓ + "已复制"
 * - 复制失败 → 红色 + 左右震 + "复制失败"
 * - 失败时震动用 motion 数值数组（避免 CSS class 切换抖动）
 */
export function CopyButton({ text, className, children }: CopyButtonProps) {
  const { state, set } = useCopyState(800);
  const [shakeKey, setShakeKey] = useState(0);
  const reduced = useReducedMotion();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      set("copied");
    } catch {
      set("error");
      setShakeKey((k) => k + 1);
    }
  };

  return (
    <motion.button
      key={shakeKey}
      type="button"
      onClick={handleCopy}
      whileTap={reduced ? undefined : { scale: 0.96 }}
      animate={
        state === "error" && !reduced
          ? { x: [0, -6, 6, -4, 4, 0] }
          : { x: 0 }
      }
      transition={
        state === "error" && !reduced
          ? { duration: 0.4 }
          : { type: "spring", stiffness: 400, damping: 17 }
      }
      className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
        state === "copied"
          ? "bg-success-soft text-success-text"
          : state === "error"
          ? "bg-danger/5 text-danger"
          : "bg-canvas-alt text-ink-mute hover:bg-hairline"
      } ${className ?? ""}`}
    >
      {state === "copied" ? (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M2 6.5L4.5 9L10 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          已复制
        </>
      ) : state === "error" ? (
        "复制失败"
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <rect
              x="3"
              y="3"
              width="7"
              height="7"
              rx="1"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M2 8V2.5C2 2.22 2.22 2 2.5 2H8"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          {children ?? "复制"}
        </>
      )}
    </motion.button>
  );
}
