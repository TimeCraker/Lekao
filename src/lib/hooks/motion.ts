"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useReducedMotion as useMotionReducedMotion } from "motion/react";

/**
 * JS 层 prefers-reduced-motion 守卫
 * - motion/react 自带 useReducedMotion（已实现 CSS + JS 双层）
 * - 本 hook 暴露简单 boolean 给非 motion 组件（如用 CSS class）
 */
export function useReducedMotion(): boolean {
  return useMotionReducedMotion() ?? false;
}

/**
 * 错误时震动包装 hook
 * 触发时给元素添加 .anim-shake class，0.4s 后移除
 * 多次触发会重置动画（用 key 强制 remount 元素）
 */
export function useShake() {
  const [shakeKey, setShakeKey] = useState(0);
  const triggerShake = useCallback(() => setShakeKey((k) => k + 1), []);
  return { shakeKey, triggerShake };
}

/**
 * 复制按钮状态机 hook
 * - 'idle' 默认
 * - 'copied' 复制成功，0.8s 后回 idle
 * - 'error' 复制失败，0.8s 后回 idle
 * - 自动清理 timer 防内存泄漏
 */
export function useCopyState(resetMs = 800) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = useCallback(
    (next: "copied" | "error") => {
      setState(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setState("idle"), resetMs);
    },
    [resetMs]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { state, set };
}
