"use client";

import { motion } from "motion/react";
import { EASE_PUBLICATION } from "@/lib/motion-tokens";
import type { ReactNode } from "react";

/**
 * Reveal — 滚入视口时 fadeUp 浮现（once:true，不重复）
 * cinematic 章节叙事节奏：每个 section 内容滚到才出现
 * delay 控制同 section 内的 stagger
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: EASE_PUBLICATION }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
