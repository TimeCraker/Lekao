// ============================================
// Lekao · 灵感墙 · 空状态组件 (v2.2.0)
// ============================================
// 3 种空状态：0 条 / 搜索无结果 / 0 条评论
// v2.2.0 #4 emoji → SVG：主图标用 SVG Icon，✨ 装饰用 SparklesIcon

"use client";

import { LightbulbIcon, SearchIcon, CommentIcon, SparklesIcon } from "@/components/icons";

interface EmptyStateProps {
  variant: "no-ideas" | "no-search" | "no-comments";
  message?: string;
}

export function IdeaEmptyState({ variant, message }: EmptyStateProps) {
  const config = {
    "no-ideas": {
      Icon: LightbulbIcon,
      title: "还没有灵感",
      desc: "第一个说说你想要啥功能吧",
    },
    "no-search": {
      Icon: SearchIcon,
      title: "没找到",
      desc: "换个词试试",
    },
    "no-comments": {
      Icon: CommentIcon,
      title: "还没有评论",
      desc: "第一个评论吧",
    },
  }[variant];

  const { Icon, title, desc } = config;

  return (
    <div className="flex flex-col items-center justify-center py-10 sm:py-12 px-4 sm:px-6 text-center">
      <div className="mb-3 sm:mb-4 text-accent-text/60">
        <Icon className="w-12 h-12" strokeWidth={1.25} />
      </div>
      <div className="text-base font-medium text-ink mb-1">
        {message ?? title}
      </div>
      <div className="text-sm text-ink-muted">{desc}</div>
      {/* no-ideas 时下方加 sparkles 装饰 */}
      {variant === "no-ideas" && (
        <div className="mt-3 text-accent-text/50 flex items-center gap-1">
          <SparklesIcon className="w-3.5 h-3.5" />
          <span className="text-xs text-ink-subtle">等你第一条灵感</span>
        </div>
      )}
    </div>
  );
}
