"use client";

import { motion, useScroll, useSpring } from "motion/react";

/**
 * 顶部滚动进度条 — 全局叙事标记
 * scaleX 跟随整页滚动进度，spring lerp 不 snap
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-[3px] bg-accent origin-left z-[60] pointer-events-none"
    />
  );
}
