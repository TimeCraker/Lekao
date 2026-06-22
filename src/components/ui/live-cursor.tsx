"use client";

import { motion, useReducedMotion } from "motion/react";

interface LiveCursorProps {
  show?: boolean;
  className?: string;
}

/**
 * 流式打字光标 · AI 文本末尾的脉冲光标
 * - 默认 blinking 0.9s 循环
 * - prefers-reduced-motion → 静态半透明
 * - 用法：放在文本流最后一个字符后面
 *   {streamedText}<LiveCursor show={isStreaming} />
 */
export function LiveCursor({ show = true, className }: LiveCursorProps) {
  const reduced = useReducedMotion();
  if (!show) return null;
  return (
    <motion.span
      aria-hidden
      className={`inline-block w-[2px] h-[1em] align-middle ml-0.5 bg-accent-text ${className ?? ""}`}
      animate={reduced ? { opacity: 0.6 } : { opacity: [1, 0.2, 1] }}
      transition={
        reduced
          ? undefined
          : { duration: 0.9, repeat: Infinity, ease: "easeInOut" }
      }
    />
  );
}
