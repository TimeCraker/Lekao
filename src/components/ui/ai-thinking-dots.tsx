"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/hooks/motion";

/**
 * AI 思考三点脉冲占位（DESIGN.md §4 登记动效 · 2026-09-29）
 * - framer 循环实现（非 CSS animationDelay），规避 reduce 下延迟归零登记义务
 * - reduce：三点静态半透明，不位移不脉冲
 * - 消费方：summary-workflow / feedback 批量进度 / weekend-ai-feedback-panel
 * - 颜色走 currentColor，由消费方容器控制色相
 */
export function AiThinkingDots({ label = "AI 正在整理…" }: { label?: string }) {
  const reduced = useReducedMotion();
  return (
    <span
      className="inline-flex items-center gap-1"
      role="status"
      aria-live="polite"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current"
          animate={
            reduced
              ? { opacity: 0.85 }
              : { opacity: [0.3, 1, 0.3], scale: [1, 1.15, 1] }
          }
          transition={
            reduced
              ? undefined
              : {
                  duration: 1.1,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }
          }
        />
      ))}
      <span className="ml-1.5 font-mono text-[10px] tracking-[0.14em] text-ink-subtle">
        {label}
      </span>
    </span>
  );
}
