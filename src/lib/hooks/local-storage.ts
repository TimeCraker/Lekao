"use client";

import { useSyncExternalStore } from "react";

/**
 * localStorage 订阅 hook（SSR 安全 · 2026-10 audit）
 *
 * 为什么不用 `useState + useEffect(setState)`：
 * effect 体内同步 setState 会引发级联渲染（react-hooks/set-state-in-effect），
 * 且 SSR HTML 与客户端首帧会分叉。
 *
 * - getServerSnapshot 恒 null：SSR HTML 与客户端首帧同树，杜绝 hydration mismatch
 * - 订阅 window storage（跨标签页）与同窗自定义事件（本页写入后立即生效）
 */
const STORAGE_EVENT = "lekao-local-storage";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(STORAGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(STORAGE_EVENT, onChange);
  };
}

export function useLocalStorageValue(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(key),
    () => null,
  );
}

/** 写入并通知同窗订阅者（storage 事件只在其它标签页触发） */
export function setLocalStorageValue(key: string, value: string): void {
  window.localStorage.setItem(key, value);
  window.dispatchEvent(new Event(STORAGE_EVENT));
}
