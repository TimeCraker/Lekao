"use client";

import { motion, AnimatePresence, useReducedMotion } from "motion/react";

interface SuccessBurstProps {
  show: boolean;
  /** 粒子数量，默认 6 */
  count?: number;
  /** 粒子颜色，默认 success（绿） */
  color?: string;
  /** 飞出距离（px），默认 24 */
  distance?: number;
}

/**
 * 成功完成时的粒子爆发
 * - 6 颗小圆点从中心向四周飞出，0.6s 缩回
 * - 用 motion.div + transform 渲染保证 GPU 加速
 * - prefers-reduced-motion → 降级为单点 fade
 * - 容器必须 relative + overflow-visible
 */
export function SuccessBurst({
  show,
  count = 6,
  color = "var(--success)",
  distance = 24,
}: SuccessBurstProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <span className="w-3 h-3 rounded-full" style={{ background: color }} />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {show && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {Array.from({ length: count }).map((_, i) => {
            const angle = (i / count) * Math.PI * 2;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            return (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                animate={{
                  x,
                  y,
                  scale: [0, 1, 1, 0],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute w-2 h-2 rounded-full"
                style={{ background: color }}
              />
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}
