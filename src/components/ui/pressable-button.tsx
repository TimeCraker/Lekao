"use client";

import { motion, useReducedMotion } from "motion/react";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface PressableButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "ref" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
  > {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-accent-text text-white hover:bg-accent-hover disabled:bg-accent-text/50",
  secondary:
    "bg-canvas-alt text-ink-mute hover:bg-hairline disabled:bg-canvas-alt/50",
  ghost:
    "bg-transparent text-ink-mute hover:bg-canvas-alt disabled:bg-transparent",
  danger: "bg-danger text-white hover:bg-danger/90 disabled:bg-danger/50",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

/**
 * 通用按钮 · 按下有弹性回弹
 * - whileTap scale 0.96 + spring 反弹
 * - loading 时禁用 + 文字替换（左侧 spinner）
 * - 保留原生 button 全部 props
 * - prefers-reduced-motion → 关闭 scale
 */
export const PressableButton = forwardRef<
  HTMLButtonElement,
  PressableButtonProps
>(function PressableButton(
  { variant = "primary", size = "md", loading, className, children, disabled, ...rest },
  ref
) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      ref={ref}
      whileTap={reduced ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      disabled={disabled || loading}
      className={`relative inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className ?? ""}`}
      {...rest}
    >
      {loading && (
        <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </motion.button>
  );
});
