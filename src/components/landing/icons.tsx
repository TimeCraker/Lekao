/**
 * Lekao Landing SVG Icons (替代 emoji, 更高级)
 * 风格: 1.5 stroke, rounded, currentColor, 24x24 viewBox
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const baseProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** 错题集 — 文档 + 红色叉号标记 */
export function MistakeIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
      <path d="M9 13l2 2 4-4" stroke="#10b981" strokeWidth={2} />
    </svg>
  );
}

/** 课堂小结 — 笔记本 + 清单 */
export function SummaryIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M4 4a2 2 0 0 1 2-2h10l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M8 8h6" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </svg>
  );
}

/** 课堂反馈 — 对话气泡 */
export function FeedbackIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 0 1-4.2-.92L3 20l1.4-4.18A7.86 7.86 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      <path d="M8 11h.01" strokeWidth={2.5} />
      <path d="M12 11h.01" strokeWidth={2.5} />
      <path d="M16 11h.01" strokeWidth={2.5} />
    </svg>
  );
}

/** 免费 — 闪光 (替换 emoji ✦) */
export function FreeIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 3l2 6 6 1-4.5 4 1.5 6.5L12 17l-5 3.5L8.5 14 4 10l6-1z" />
    </svg>
  );
}

/** T-Coin — 金币 (替换 emoji 🪙) */
export function CoinIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10" />
      <path d="M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" />
    </svg>
  );
}
