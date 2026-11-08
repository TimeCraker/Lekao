import { cn } from "@/lib/utils";

/**
 * S03 T-302 · 按钮类名矩阵（Server Component 兼容）
 *
 * 状态样式走语义 token。触点、focus-visible ring、禁用态 opacity 由基类统一承担。
 * 单测锁 buttonClass；页面按钮不经过这一层组件封装。
 */

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-[10px] font-medium transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent-text text-white hover:bg-accent-hover",
  secondary:
    "bg-canvas-alt text-ink hover:bg-accent-soft hover:text-accent-ink",
  ghost: "text-ink-mute hover:text-ink hover:bg-canvas-alt",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
};

/** 纯函数：按钮类名矩阵（可单测，无需渲染） */
export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(
    BUTTON_BASE,
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className,
  );
}
