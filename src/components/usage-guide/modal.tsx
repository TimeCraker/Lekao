"use client";

/**
 * 使用说明 Modal（3 模块通用 · Round 2026-06-20）
 *
 * 设计原则：
 * - 右滑 slide-over（更现代 UX，不打断主页面流）
 * - 内容按步骤分组，每步 = icon + 标题 + 简短说明
 * - 关闭 = 点 X / 点遮罩 / 按 ESC
 * - 全 SVG icon，无 emoji
 * - 长内容可滚动（max-h + overflow-y-auto）
 */

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  CloseIcon,
  LightbulbIcon,
  type IconProps,
} from "@/components/icons";

export type UsageStep = {
  icon: React.ComponentType<IconProps>;
  title: string;
  desc: string;
  /** 可选：tip 小字（用浅蓝底） */
  tip?: string;
};

export type UsageSection = {
  title: string;
  steps: UsageStep[];
  /** 可选：底部备注/警告 */
  footer?: { tone: "info" | "warn"; text: string };
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** 模态标题 · 如"课堂小结使用说明" */
  title: string;
  /** 副标题/导语（一行说明这模块解决什么问题） */
  subtitle: string;
  sections: UsageSection[];
};

export function UsageGuideModal({
  open,
  onClose,
  title,
  subtitle,
  sections,
}: Props) {
  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  // body scroll lock
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* 遮罩 */}
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-[fadeIn_0.18s_ease-out]"
      />

      {/* 抽屉（右侧滑出 · 桌面 480px, 移动全宽） */}
      <aside
        className={cn(
          "absolute top-0 right-0 bottom-0 w-full sm:w-[480px] bg-white shadow-2xl",
          "flex flex-col animate-[slideInRight_0.22s_ease-out]",
        )}
      >
        {/* Header */}
        <header className="shrink-0 px-6 py-5 border-b border-hairline flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink truncate">{title}</h2>
            <p className="text-sm text-ink-muted mt-1">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-ink-mute hover:bg-canvas-alt hover:text-ink transition"
          >
            <CloseIcon className="w-[18px] h-[18px]" />
          </button>
        </header>

        {/* Body · 步骤列表 */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {sections.map((section, sIdx) => (
            <section key={sIdx}>
              <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-4">
                {section.title}
              </h3>

              <ol className="space-y-4">
                {section.steps.map((step, stIdx) => (
                  <li key={stIdx} className="flex gap-3">
                    {/* 步骤序号 + icon */}
                    <div className="shrink-0 flex flex-col items-center">
                      <div className="w-10 h-10 rounded-xl bg-accent-soft flex items-center justify-center">
                        <step.icon className="w-5 h-5 text-accent-text" />
                      </div>
                      {stIdx < section.steps.length - 1 && (
                        <div className="w-px flex-1 bg-hairline mt-2" />
                      )}
                    </div>

                    {/* 文本 */}
                    <div className="flex-1 min-w-0 pb-2">
                      <div className="text-sm font-semibold text-ink">
                        {stIdx + 1}. {step.title}
                      </div>
                      <p className="text-sm text-ink-muted mt-1 leading-relaxed">
                        {step.desc}
                      </p>
                      {step.tip && (
                        <div className="mt-2 text-xs text-accent-ink bg-accent-soft/40 border border-accent/15 rounded-md px-2.5 py-1.5 inline-flex items-start gap-1.5">
                          <LightbulbIcon className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{step.tip}</span>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>

              {section.footer && (
                <div
                  className={cn(
                    "mt-4 ml-[52px] text-xs rounded-lg px-3 py-2",
                    section.footer.tone === "warn"
                      ? "bg-warning/10 text-warning-text"
                      : "bg-canvas-alt text-ink-muted",
                  )}
                >
                  {section.footer.text}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Footer · 关闭按钮 */}
        <footer className="shrink-0 px-6 py-4 border-t border-hairline bg-canvas-alt/50">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-accent-text text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition"
          >
            知道了 · 开始使用
          </button>
        </footer>
      </aside>

      {/* 注入 keyframes（一次性，类名靠 Tailwind 的 arbitrary value 不行，改用 inline style tag） */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}