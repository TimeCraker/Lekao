"use client";

import { useEffect, useRef } from "react";

/**
 * 弹层键盘可访问性 hook（焦点陷阱 + Esc 关闭 + 初始聚焦 + 焦点恢复）
 *
 * 用法：容器元素（role="dialog"）挂 ref，open 时自动：
 * 1. 记录打开前的焦点，关闭/卸载后恢复；
 * 2. 聚焦容器内第一个可聚焦元素；
 * 3. Tab / Shift+Tab 循环限制在容器内；
 * 4. Escape 触发 onClose。
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialogA11y({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  // onClose 可能每渲染变化，用 ref 让键盘监听器稳定订阅
  // （ref 只在 effect 中写：渲染期写 ref 会破坏并发渲染的可重放性）
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    prevFocusRef.current = document.activeElement as HTMLElement | null;

    // 初始聚焦：容器本身（tabIndex=-1），避免焦点落在遮罩按钮上
    const node = containerRef.current;
    if (node) {
      node.focus();
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !containerRef.current) return;
      const items = Array.from(
        containerRef.current!.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) {
        e.preventDefault();
        containerRef.current!.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === containerRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKey, true);
    return () => {
      window.removeEventListener("keydown", handleKey, true);
      // 焦点恢复（元素可能已卸载）
      const prev = prevFocusRef.current;
      if (prev && document.contains(prev)) prev.focus();
    };
  }, [open]);

  return containerRef;
}
