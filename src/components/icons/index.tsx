/**
 * Lekao 集中 SVG Icons（dashboard + landing + summary + mistake 通用）
 * 风格：1.5 stroke · rounded · currentColor · 24x24 viewBox
 *
 * 所有 emoji 已统一替换为 SVG 组件
 */
import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

const baseProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/* ============================================
 * 业务功能图标
 * ============================================ */

/** 错题集 — 文档 + 绿色对勾 */
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

/** 堂测反馈 — 测验卷（替代原对话气泡） */
export function FeedbackIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M9 2h6a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <path d="M9 2v4h6" />
      <path d="M11 11h6" />
      <path d="M11 15h4" />
      <circle cx="11.5" cy="8" r="0.5" fill="currentColor" />
    </svg>
  );
}

/** 控制台/仪表盘 — 4 格柱状图 */
export function DashboardIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

/** 管理员 — 齿轮 */
export function AdminIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/** 个人 — 用户头像 */
export function ProfileIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  );
}

/** 退出 — 门 + 箭头 */
export function LogoutIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

/* ============================================
 * 通用 UI 图标
 * ============================================ */

/** 时间 — 时钟 */
export function ClockIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/** 邮箱 — 信封 */
export function MailIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

/**
 * GitHub Mark — 官方 Octocat 简化版
 * 用 currentColor 渲染（fill 而非 stroke），与品牌视觉一致
 * 2026-06-22 v2.1.0+ 新增：用户要求 Hero/Footer GitHub 链接加图标
 */
export function GithubIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

/** T-Coin — 金币 */
export function CoinIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10" />
      <path d="M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" />
    </svg>
  );
}

/** 免费 — 闪光 */
export function FreeIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 3l2 6 6 1-4.5 4 1.5 6.5L12 17l-5 3.5L8.5 14 4 10l6-1z" />
    </svg>
  );
}

/** Sparkle — AI 生成 */
export function SparkleIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
      <path d="M19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9z" />
    </svg>
  );
}

/** Check — ✓ */
export function CheckIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M5 12l4 4L19 7" />
    </svg>
  );
}

/** Arrow right — → */
export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

/** Arrow left — ← */
export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

/** Upload — 上传 */
export function UploadIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  );
}

/** Sidebar collapse — 收起 */
export function CollapseIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      <path d="M14 10l-2 2 2 2" />
    </svg>
  );
}

/** Sidebar expand — 展开 */
export function ExpandIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      <path d="M13 10l2 2-2 2" />
    </svg>
  );
}

/** Menu — 汉堡 */
export function MenuIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M3 12h18" />
      <path d="M3 6h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

/** Reset — 清空 */
export function ResetIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

/** Chevron right — › */
export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/** Eye — 预览 */
export function EyeIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** X / Close — 关闭 */
export function CloseIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

/** Document — 文档 */
export function DocumentIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </svg>
  );
}

/** Word — Word 文档 */
export function WordIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
      <path d="M9 16l1.5-4 1.5 3 1.5-3 1.5 4" />
    </svg>
  );
}

/** Excel — 表格 */
export function ExcelIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </svg>
  );
}

/** Download — 下载 */
export function DownloadIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

/** Lightbulb — 提示 */
export function LightbulbIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" />
    </svg>
  );
}

/** Trash — 删除 */
export function TrashIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

/** Refresh — 重做/刷新（错题集历史面板用）*/
export function RefreshIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <polyline points="21 3 21 8 16 8" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <polyline points="3 21 3 16 8 16" />
    </svg>
  );
}

/** QuestionMark — 使用说明/帮助 */
export function HelpIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 4.9.7c0 1.5-2.4 2-2.4 3.3" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  );
}

/** Grid — Sheet/学科选择 */
export function GridIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

/** Edit — 编辑封面信息 */
export function EditIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

/** List — 题号槽位/列表 */
export function ListIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

/** Users — 学生列表 */
export function UsersIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/** Copy — 复制 */
export function CopyIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/** Image — 讲义图片 */
export function ImageIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

/** Filter — 去重/筛选 */
export function FilterIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M22 3H2l8 9.46V19l4 2v-8.54z" />
    </svg>
  );
}

/** Search — 搜索 */
export function SearchIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

/** History — 时间/流水 */
export function HistoryIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-7 3.3" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/** Shield — 审计/盾牌 */
export function ShieldIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/** Thumbs up — 点赞 */
export function ThumbsUpIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M7 10v11" />
      <path d="M3 10h4v11H3z" />
      <path d="M7 10l4-7c1.5 0 2.5 1 2.5 2.5V10h5.5a2 2 0 0 1 2 2.3l-1.5 7a2 2 0 0 1-2 1.7H7" />
    </svg>
  );
}

/** Message circle — 评论 */
export function CommentIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M21 12a9 9 0 0 1-12 8.4L3 21l1-5A9 9 0 1 1 21 12z" />
    </svg>
  );
}

/** X — 关闭 */
export function XIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

/** ChevronDown — 展开 */
export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/* ============================================
 * v2.2.0 灵感墙专用图标（emoji 替换 · 高级 SVG）
 * ============================================ */

/** 火焰（热度） — 外焰 + 内焰 + 底座 */
export function FlameIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M8.5 14a4 4 0 0 0 7 0c0-2-1.5-3-1.5-5 0-1.5 1-2.5 1-2.5s-4 0-5.5-4c0 0-1 4-3 6-1.4 1.4-2 2.6-2 4a4 4 0 0 0 4 1.5z" />
      <path d="M12 19a3 3 0 0 1-3-3" opacity={0.5} />
      <path d="M10.5 16.5c.5.5 1 1 1.5 1" opacity={0.6} />
    </svg>
  );
}

/** 奖杯（TOP 3 标题）— 杯身 + 把手 + 底座 */
export function TrophyIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
      <path d="M7 5H4v2a3 3 0 0 0 3 3" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3" />
      <path d="M9 21h6" />
      <path d="M12 17v4" />
      <path d="M8 14h8" />
    </svg>
  );
}

/** 奖牌（金银铜）— 圆形牌 + 飘带 + 数字 1/2/3 + color prop 控色 */
export function MedalIcon({
  rank,
  ...props
}: IconProps & { rank: 1 | 2 | 3 }) {
  // 金/银/铜：fill 用更暖的"高级"色调
  const palette = {
    1: { ribbon: "#f59e0b", medal: "#fbbf24", shine: "#fef3c7" }, // 金
    2: { ribbon: "#94a3b8", medal: "#cbd5e1", shine: "#f1f5f9" }, // 银
    3: { ribbon: "#b45309", medal: "#d97706", shine: "#fed7aa" }, // 铜
  }[rank];

  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      {/* 飘带 */}
      <path
        d="M9 4h6l-1 4-2 2-2-2-1-4z"
        fill={palette.ribbon}
        stroke="currentColor"
        strokeWidth={1}
        strokeLinejoin="round"
        opacity={0.9}
      />
      {/* 牌身 */}
      <circle
        cx="12"
        cy="15"
        r="6"
        fill={palette.medal}
        stroke="currentColor"
        strokeWidth={1.2}
      />
      {/* 高光 */}
      <circle cx="10" cy="13" r="1.5" fill={palette.shine} opacity={0.7} />
      {/* 数字 */}
      <text
        x="12"
        y="17.5"
        textAnchor="middle"
        fontSize="7"
        fontWeight="700"
        fill="white"
        fontFamily="system-ui, sans-serif"
      >
        {rank}
      </text>
    </svg>
  );
}

/** 闪光（提交按钮）— 4 角 + 中心 + 主光芒 */
export function SparklesIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
      <path d="M19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7z" />
      <path d="M5 16l.5 1.5L7 18l-1.5.5L5 20l-.5-1.5L3 18l1.5-.5z" />
    </svg>
  );
}

/** 纸飞机（发送）— 三角翼 + 路径 */
export function SendIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M21 3L11 14" />
      <path d="M21 3l-6.5 18-3.5-8-8-3.5z" />
    </svg>
  );
}