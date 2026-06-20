"use client";

import { cn } from "@/lib/utils";

export type TemplateType = "summary" | "feedback";

type Tab = {
  id: TemplateType;
  label: string;
  emoji: string;
  desc: string;
};

const TABS: Tab[] = [
  {
    id: "summary",
    label: "课堂小结",
    emoji: "📝",
    desc: "备课组存档风格 · 专业清晰",
  },
  {
    id: "feedback",
    label: "家长反馈",
    emoji: "💬",
    desc: "家长群风格 · 亲切鼓励",
  },
];

type Props = {
  value: TemplateType;
  onChange: (v: TemplateType) => void;
  disabled?: boolean;
};

/**
 * 模板选择（单列纵向 · 参考侧边栏风格）
 *
 * 视觉：左 icon + 标题左对齐 + 描述在右
 * active：蓝色左边条 + 浅蓝背景 + 蓝字
 */
export function TemplateTabs({ value, onChange, disabled }: Props) {
  return (
    <div className="space-y-2">
      {TABS.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(t.id)}
            className={cn(
              "group relative w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              active
                ? "border-accent bg-accent-soft shadow-sm"
                : "border-hairline bg-white hover:border-accent/40 hover:bg-accent-soft/30",
            )}
          >
            {/* 侧边栏风格左边条（active 时显示） */}
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent rounded-r" />
            )}

            <span className="text-2xl shrink-0">{t.emoji}</span>

            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  "font-semibold text-sm",
                  active ? "text-accent-ink" : "text-ink",
                )}
              >
                {t.label}
              </div>
              <div className="text-xs text-ink-muted mt-0.5">{t.desc}</div>
            </div>

            {active && (
              <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent text-white text-xs">
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}