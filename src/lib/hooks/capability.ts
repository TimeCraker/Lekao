"use client";

import { useSyncExternalStore } from "react";
import { isFileSystemAccessSupported } from "@/lib/mistake/fs-access";

/**
 * 浏览器能力探测 hook（SSR 安全 · 2026-10 audit）
 *
 * 为什么不写 `useEffect(() => setX(detect()), [])`：
 * effect 体内同步 setState 触发级联渲染（react-hooks/set-state-in-effect），
 * 且能力值在组件生命周期内不变，用外部存储订阅表达更准确。
 *
 * getServerSnapshot 恒 false → SSR HTML 与客户端首帧同树；hydration 后
 * React 自动用 getSnapshot 重渲染一次，得到真实能力值。
 */
const FINE_POINTER_QUERY = "(pointer: fine)";

/** 能力在运行期不变，无需订阅 */
const noopSubscribe = () => () => {};

function subscribeFinePointer(onChange: () => void) {
  const mql = window.matchMedia(FINE_POINTER_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** 精细指针（鼠标/触控板）设备；触屏为 false */
export function useFinePointer(): boolean {
  return useSyncExternalStore(
    subscribeFinePointer,
    () => window.matchMedia(FINE_POINTER_QUERY).matches,
    () => false,
  );
}

/** File System Access API（Chrome/Edge 目录授权导出）是否可用 */
export function useFileSystemAccessSupported(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => isFileSystemAccessSupported(),
    () => false,
  );
}
