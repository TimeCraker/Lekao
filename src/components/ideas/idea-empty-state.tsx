// ============================================
// Lekao · 灵感墙 · 空状态组件 (v2.2.0)
// ============================================
// 3 种空状态：0 条 / 搜索无结果 / 0 条评论

"use client";

import { LightbulbIcon } from "@/components/icons";

interface EmptyStateProps {
  variant: "no-ideas" | "no-search" | "no-comments";
  message?: string;
}

export function IdeaEmptyState({ variant, message }: EmptyStateProps) {
  const config = {
    "no-ideas": {
      icon: "💡",
      title: "还没有灵感",
      desc: "第一个说说你想要啥功能吧 ✨",
    },
    "no-search": {
      icon: "🔍",
      title: "没找到",
      desc: "换个词试试",
    },
    "no-comments": {
      icon: "💬",
      title: "还没有评论",
      desc: "第一个评论吧",
    },
  }[variant];

  return (
    <div className="flex flex-col items-center justify-center py-10 sm:py-12 px-4 sm:px-6 text-center">
      <div className="text-5xl mb-3 sm:mb-4 opacity-60">{config.icon}</div>
      <div className="text-base font-medium text-ink mb-1">
        {message ?? config.title}
      </div>
      <div className="text-sm text-ink-muted">{config.desc}</div>
      {/* 用 LightbulbIcon 占位，避免 no-ideas 时图标空白 */}
      {variant === "no-ideas" && (
        <div className="mt-2 text-ink-subtle">
          <LightbulbIcon className="w-6 h-6 inline-block opacity-40" />
        </div>
      )}
    </div>
  );
}