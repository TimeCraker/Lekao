"use client";

/**
 * Step 2 · 多 Sheet 选择器
 * 来源：STAGE spec §6.1 Step 2 + PRD §3.5.5
 *
 * UI：列表 + 前 3 行预览
 */

import type { SheetMetadata } from "@/lib/mistake/excel-parser";

export interface SheetSelectorProps {
  sheets: SheetMetadata[];
  selectedSheet: string | null;
  onSelect: (sheetName: string) => void;
}

export function SheetSelector({
  sheets,
  selectedSheet,
  onSelect,
}: SheetSelectorProps) {
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-sm font-medium text-ink-muted">
          检测到 {sheets.length} 个 Sheet
        </span>
        <span className="text-xs text-ink-subtle">请选择 1 个学科</span>
      </div>

      <div className="space-y-2">
        {sheets.map((sheet) => {
          const isSelected = sheet.name === selectedSheet;
          return (
            <button
              key={sheet.name}
              type="button"
              onClick={() => onSelect(sheet.name)}
              className={`
                w-full text-left rounded-xl border p-4 transition
                ${
                  isSelected
                    ? "border-accent bg-accent-soft/30 ring-1 ring-accent/30"
                    : "border-hairline bg-white hover:border-accent/50"
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`
                    w-4 h-4 rounded-full border-2 transition flex items-center justify-center
                    ${isSelected ? "border-accent bg-accent" : "border-hairline"}
                  `}
                  aria-hidden
                >
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink truncate">
                      {sheet.name}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {sheet.rowCount} 行
                    </span>
                  </div>
                  {sheet.preview.length > 0 && (
                    <div className="mt-2 text-xs text-ink-subtle truncate font-mono">
                      {sheet.preview[0]
                        ?.filter(Boolean)
                        .slice(0, 6)
                        .join(" | ")}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {sheets.length === 0 && (
        <div className="rounded-xl border border-hairline bg-white p-8 text-center text-sm text-ink-muted">
          这个 Excel 里没找到能用的 Sheet
        </div>
      )}
    </div>
  );
}
