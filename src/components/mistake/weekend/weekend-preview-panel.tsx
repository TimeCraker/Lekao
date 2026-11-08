"use client";

import { useEffect, useRef, useState } from "react";
import type ExcelJS from "exceljs";
import {
  buildExportWorkbook,
  loadWeekendWorkbookForExport,
} from "@/lib/mistake/weekend-exporter";
import type { WeekendSheet, WeekendStudent } from "@/lib/mistake/weekend-types";
import { buildSheetGrid } from "@/lib/deliver/xlsx-render";
import type { SheetGrid } from "@/lib/deliver/render-types";
import { DeliveryPanel } from "@/components/deliver/delivery-panel";

/**
 * S04 T-403 · 周末反馈表「导出前真实表样预览 + 单元格修正」
 *
 * 预览渲染的是**真实导出路径**产出的同一份 Workbook（loadWeekendWorkbookForExport →
 * buildExportWorkbook → buildSheetGrid），所以看到的就是将要交付的表格：
 * 合并、列宽、字体、对齐都由导出器决定，不是另画一套。
 *
 * 修正走源模型（onStudentPatch → 父级 updateStudent），改完立即重建表样，
 * 因此「预览 = 导出件」在结构上成立。
 *
 * 下载仍由导出栏负责：那里有 conditionalFormatting 剥离等必要后处理，不重复实现。
 */
export interface WeekendPreviewPanelProps {
  open: boolean;
  onClose: () => void;
  sheet: WeekendSheet;
  uploadedFile: File | null;
  onStudentPatch: (
    sheetName: string,
    rowIndex: number,
    patch: Partial<WeekendStudent>,
  ) => void;
}

type GridState =
  | { status: "building" }
  | { status: "ready"; grid: SheetGrid }
  | { status: "failed"; message: string };

export function WeekendPreviewPanel({
  open,
  onClose,
  sheet,
  uploadedFile,
  onStudentPatch,
}: WeekendPreviewPanelProps) {
  const [state, setState] = useState<GridState>({ status: "building" });
  const wbRef = useRef<ExcelJS.Workbook | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    // 0ms 调度：把会 setState 的异步建表移出 effect 同步路径
    const timer = setTimeout(() => {
      void (async () => {
        try {
          setState({ status: "building" });
          if (!uploadedFile) {
            throw new Error("原文件已丢失，请重新上传");
          }
          // 每次重建都从原文件重新加载：buildExportWorkbook 是原地改写，
          // 复用同一份会让「多次修正」叠加在已改写的 workbook 上
          const wb = await loadWeekendWorkbookForExport(uploadedFile);
          wbRef.current = wb;
          buildExportWorkbook(wb, [sheet]);
          const ws = wb.getWorksheet(sheet.sheetName);
          if (!ws)
            throw new Error(`原文件里找不到 Sheet「${sheet.sheetName}」`);
          const grid = buildSheetGrid(ws);
          if (!cancelled) setState({ status: "ready", grid });
        } catch (err) {
          if (!cancelled) {
            setState({
              status: "failed",
              message: err instanceof Error ? err.message : "生成表样失败",
            });
          }
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, sheet, uploadedFile]);

  if (!open) return null;

  const editor = (
    <div className="p-4 space-y-3 text-sm">
      <p className="text-xs text-ink-muted">
        {sheet.sheetName} · {sheet.students.length} 名学生 · 修正后表样立即重排
      </p>
      {sheet.students.map((s) => (
        <div
          key={s.rowIndex}
          className="rounded-lg border border-hairline p-3 space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-ink truncate">
              {s.name || "（空姓名）"}
            </span>
            <span className="text-xs text-ink-subtle shrink-0">
              R{s.rowIndex + 1}
            </span>
          </div>
          <label className="block text-xs text-ink-subtle">
            错题
            <input
              value={s.qNumbersInput}
              onChange={(e) =>
                onStudentPatch(sheet.sheetName, s.rowIndex, {
                  qNumbersInput: e.target.value,
                })
              }
              className="mt-1 w-full px-2 py-1.5 border border-hairline rounded text-xs focus:outline-none focus:border-accent"
            />
          </label>
          <label className="block text-xs text-ink-subtle">
            反馈
            <textarea
              value={s.feedback}
              rows={3}
              onChange={(e) =>
                onStudentPatch(sheet.sheetName, s.rowIndex, {
                  feedback: e.target.value,
                })
              }
              className="mt-1 w-full px-2 py-1.5 border border-hairline rounded text-xs focus:outline-none focus:border-accent"
            />
          </label>
        </div>
      ))}
    </div>
  );

  if (state.status === "failed") {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Excel 预览"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60"
      >
        <div className="bg-white rounded-2xl p-6 max-w-md space-y-3">
          <p className="text-sm font-medium text-danger-text">
            表样预览失败：{state.message}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-4 rounded-lg bg-canvas-alt text-sm"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }

  if (state.status === "building") {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Excel 预览"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60"
      >
        <div className="bg-white rounded-2xl px-6 py-10 text-sm text-ink-subtle">
          正在按真实导出路径生成表样…
        </div>
      </div>
    );
  }

  // 统一交付面（S04 T-406）：下载仍由导出栏负责（保留 conditionalFormatting 后处理）
  return (
    <DeliveryPanel
      kind="xlsx"
      open={open}
      onClose={onClose}
      grid={state.grid}
      fileName={`${sheet.sheetName}（表样预览）`}
      title="Excel 表样预览与修正"
      editor={editor}
      summary="关闭预览后用下方「导出 Excel」下载（保留模板样式）"
    />
  );
}
