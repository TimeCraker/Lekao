"use client";

import { useState, useCallback, useSyncExternalStore } from "react";

/**
 * JS 层 prefers-reduced-motion 守卫（自制 useSyncExternalStore 版 · 2026-09-29）
 * - getServerSnapshot 恒 false：SSR HTML 与客户端首帧同树，杜绝 hydration 分叉
 * - 禁用 motion/react 自带 useReducedMotion：其 useState 首值在 SSR/客户端不一致，
 *   reduce 用户首帧会渲染两棵不同的树（ResumeAIX P0 事故教训，见 DESIGN.md §4）
 * - 订阅 matchMedia change，系统偏好变化即时生效
 */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
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
