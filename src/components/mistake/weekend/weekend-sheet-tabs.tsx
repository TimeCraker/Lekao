"use client";

/**
 * 周末错题反馈表 · 多 Sheet 切换 tabs
 * 来源：docs/stages/weekend-mistake-table-v0.md Stage 1
 *
 * 设计要点：
 * - tabs 显示 sheet 名 + 学生数 + 已填数（"已填 X/Y"）
 * - 当前 active 高亮
 * - 移动端可横滑（overflow-x-auto）
 */

import { CheckIcon } from "@/components/icons";

export interface WeekendSheetTabItem {
  sheetName: string;
  studentCount: number;
  filledCount: number; // 已填错题或已选特殊情况的学生数
}

export function WeekendSheetTabs({
  sheets,
  activeIdx,
  onChange,
}: {
  sheets: WeekendSheetTabItem[];
  activeIdx: number;
  onChange: (idx: number) => void;
}) {
  if (sheets.length === 0) return null;

  return (
    <div className="overflow-x-auto -mx-2 px-2 pb-1">
      <div className="inline-flex items-center gap-2 min-w-full">
        {sheets.map((s, idx) => {
          const isActive = idx === activeIdx;
          const isFull = s.filledCount >= s.studentCount && s.studentCount > 0;
          return (
            <button
              key={s.sheetName}
              type="button"
              onClick={() => onChange(idx)}
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap shrink-0
                ${
                  isActive
                    ? "bg-accent-text text-white shadow-sm"
                    : "bg-canvas-alt text-ink-muted hover:bg-accent-soft hover:text-accent-ink"
                }
              `}
            >
              <span>{s.sheetName}</span>
              <span
                className={`
                  inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full
                  ${
                    isActive
                      ? "bg-white/20 text-white"
                      : isFull
                      ? "bg-success-soft text-success-text"
                      : "bg-white text-ink-subtle"
                  }
                `}
              >
                {isFull && !isActive && <CheckIcon className="w-2.5 h-2.5" />}
                {s.filledCount}/{s.studentCount}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}