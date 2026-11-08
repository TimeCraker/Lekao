"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";
import type ExcelJS from "exceljs";
import {
  applyClassText,
  applySink,
  detectColumns,
  loadWorkbookFromFile,
  planSink,
  workbookToBlob,
  type SinkStudentInput,
  type SinkUnmatchedReason,
} from "@/lib/deliver/excel-sink";
import { buildSheetGrid } from "@/lib/deliver/xlsx-render";
import type { SheetGrid } from "@/lib/deliver/render-types";
import { DeliveryPanel } from "@/components/deliver/delivery-panel";
import { useDialogA11y } from "@/lib/hooks/dialog-a11y";

/**
 * S04 T-404 · Excel 落版面板
 *
 * 两种落版模式（对应两类 AI 产出）：
 * - 按学生写：周末流程的逐生 AI 反馈（有姓名 → 按姓名匹配行）
 * - 整段写：课堂小结/班级反馈（无姓名 → 用户指定单元格）
 *
 * 保守原则与 excel-sink 一致：识别不到列/重名/合并区都不猜；
 * 未命中的 AI 文本**原样展示并可复制**（写入失败不丢文本，DoD）。
 */
export interface ExcelSinkPanelProps {
  open: boolean;
  onClose: () => void;
  /** 按学生写的数据（周末流程） */
  entries?: SinkStudentInput[];
  /** 整段写的数据（小结页，班级级文本） */
  classText?: string;
  /** 面板标题 */
  title?: string;
}

type Phase = "setup" | "preview";

const REASON_LABEL: Record<SinkUnmatchedReason, string> = {
  empty_name: "AI 侧姓名为空",
  missing: "表里没有这个姓名",
  duplicate: "表里同名多行，不猜",
  merged: "目标格在合并区里，需手工处理",
  no_column: "没识别到姓名/反馈列，请点列",
};

export function ExcelSinkPanel({
  open,
  onClose,
  entries,
  classText,
  title,
}: ExcelSinkPanelProps) {
  const dialogRef = useDialogA11y({ open, onClose });
  const fileRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("setup");
  const [wb, setWb] = useState<ExcelJS.Workbook | null>(null);
  const [fileName, setFileName] = useState("");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [manualColumn, setManualColumn] = useState("");
  const [classRow, setClassRow] = useState("3");
  const [classColumn, setClassColumn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [grid, setGrid] = useState<SheetGrid | null>(null);

  // workbook / 派生数据都是渲染相关 → 放 state + useMemo，而不是 ref
  const ws = useMemo(
    () => wb?.getWorksheet(sheetNames[sheetIdx] ?? "") ?? null,
    [wb, sheetNames, sheetIdx],
  );

  const detection = useMemo(() => (ws ? detectColumns(ws) : null), [ws]);

  const hasEntries = Boolean(entries?.length);
  const hasClassText = Boolean(classText?.trim());

  const entryPlan = useMemo(() => {
    if (!ws || !entries?.length) return null;
    return planSink(ws, entries, {
      manualFeedbackColumn: manualColumn ? Number(manualColumn) : undefined,
    });
  }, [ws, entries, manualColumn]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open) return null;

  const effectiveColumn = manualColumn
    ? Number(manualColumn)
    : (detection?.columns.feedback ?? null);

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const loaded = await loadWorkbookFromFile(file);
      const names = loaded.worksheets.map((w) => w.name);
      setWb(loaded);
      setSheetNames(names);
      setSheetIdx(0);
      setFileName(file.name);
      const first = loaded.getWorksheet(names[0]);
      if (first) {
        setClassColumn(String(detectColumns(first).columns.feedback ?? ""));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "读取表格失败（需要 .xlsx 文件）",
      );
    }
  }

  function buildPreview() {
    if (!ws) return;
    if (hasEntries && entryPlan) {
      if (!entryPlan.feedbackColumn) {
        setError("请先指定反馈列（没识别到表头时需要手点列）");
        return;
      }
      applySink(ws, entryPlan);
    } else if (hasClassText) {
      const result = applyClassText(ws, {
        row: Number(classRow) || 3,
        column: Number(classColumn) || effectiveColumn || 0,
        text: classText!.trim(),
      });
      if (!result.ok) {
        setError(
          result.reason === "merged"
            ? "目标格在合并区里，请换一个单元格"
            : "行/列号无效",
        );
        return;
      }
    } else {
      setError("没有可写入的内容");
      return;
    }
    setError(null);
    setGrid(buildSheetGrid(ws));
    setPhase("preview");
  }

  async function download() {
    if (!wb) return;
    const blob = await workbookToBlob(wb);
    saveAs(blob, fileName.replace(/\.xlsx$/i, "") + "-已落版.xlsx");
  }

  const heading = title ?? "写入教师表格";

  if (phase === "preview" && grid) {
    const unmatched = entryPlan?.unmatched ?? [];
    return (
      <DeliveryPanel
        kind="xlsx"
        open={open}
        onClose={onClose}
        grid={grid}
        fileName={`${fileName}（已写入）`}
        title={heading}
        summary={
          hasEntries && entryPlan
            ? `已写入 ${entryPlan.matches.length} 行；未命中 ${unmatched.length} 条（见左侧，可复制原文）`
            : "整段文本已写入指定单元格"
        }
        editor={
          <div className="p-4 space-y-3 text-sm">
            {hasEntries && entryPlan && (
              <>
                {unmatched.map((u, i) => {
                  const text = entries?.find(
                    (e) => e.name.trim() === u.name,
                  )?.text;
                  const key = `${u.name}-${i}`;
                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-hairline p-3 space-y-1.5"
                    >
                      <p className="text-xs font-medium text-ink">
                        {u.name || "（空姓名）"}
                        <span className="ml-2 font-normal text-danger-text">
                          {REASON_LABEL[u.reason]}
                        </span>
                      </p>
                      {text && (
                        <div className="space-y-1">
                          <p className="text-xs text-ink-subtle break-all">
                            {text}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard
                                .writeText(text)
                                .then(() => setCopied(key))
                                .catch(() => setCopied(null));
                            }}
                            className="min-h-9 px-2 rounded border border-hairline text-xs"
                          >
                            {copied === key ? "已复制" : "复制文本"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        }
        onDownload={() => void download()}
        onReedit={() => setPhase("setup")}
        labels={{ download: "下载落版后的表格", reedit: "返回修改" }}
      />
    );
  }

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-ink/60 backdrop-blur-sm focus:outline-none"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-hairline">
          <h2 className="text-base font-semibold text-ink">{heading}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-md text-ink-muted hover:text-ink hover:bg-canvas-alt transition"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto px-4 sm:px-6 py-4 space-y-4 text-sm">
          <p className="text-xs text-ink-muted">
            选择老师的反馈表（.xlsx）。写入只改目标单元格的值与换行/对齐，不重排老师的模板；写入后可预览再下载。
          </p>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full min-h-11 rounded-lg border border-dashed border-hairline px-4 py-3 text-left text-sm text-ink-muted hover:border-accent hover:text-accent transition"
          >
            {fileName
              ? `已选择：${fileName}（点击可换）`
              : "点击选择 .xlsx 文件"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => void onPickFile(e.target.files?.[0])}
          />

          {sheetNames.length > 1 && (
            <label className="block text-xs text-ink-muted">
              Sheet
              <select
                value={sheetIdx}
                onChange={(e) => setSheetIdx(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 border border-hairline rounded-lg text-sm"
              >
                {sheetNames.map((n, i) => (
                  <option key={n} value={i}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          )}

          {detection && (
            <div className="rounded-lg border border-hairline p-3 space-y-1.5 text-xs">
              <p className="font-medium text-ink">表头识别（第 2 行）</p>
              <p className="text-ink-muted">
                姓名列：
                {detection.nameFound
                  ? `第 ${detection.columns.name} 列 ✓`
                  : "未识别到（不能自动按姓名写，请补表头或改用整段模式）"}
              </p>
              <p className="text-ink-muted">
                反馈列：
                {detection.columns.feedback
                  ? `第 ${detection.columns.feedback} 列 ✓`
                  : "未识别到，可手动指定 ↓"}
              </p>
              {!detection.columns.feedback && (
                <label className="block pt-1">
                  手动指定反馈列号（A=1、B=2…）
                  <input
                    value={manualColumn}
                    onChange={(e) =>
                      setManualColumn(e.target.value.replace(/\D/g, ""))
                    }
                    inputMode="numeric"
                    placeholder="如 4"
                    className="mt-1 w-24 px-2 py-1.5 border border-hairline rounded text-sm"
                  />
                </label>
              )}
              {hasEntries && entryPlan && (
                <p className="pt-1 text-ink">
                  匹配结果：可写 {entryPlan.matches.length} 行 · 未命中{" "}
                  {entryPlan.unmatched.length} 条
                  {entryPlan.unmatched.length > 0 && (
                    <span className="text-ink-subtle">
                      （
                      {entryPlan.unmatched
                        .map(
                          (u) =>
                            `${u.name || "空姓名"}:${REASON_LABEL[u.reason]}`,
                        )
                        .join("；")}
                      ）
                    </span>
                  )}
                </p>
              )}
              {hasClassText && (
                <div className="flex items-end gap-2 pt-1">
                  <label className="text-xs">
                    写入行
                    <input
                      value={classRow}
                      onChange={(e) =>
                        setClassRow(e.target.value.replace(/\D/g, ""))
                      }
                      inputMode="numeric"
                      className="mt-1 w-16 px-2 py-1.5 border border-hairline rounded text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    写入列
                    <input
                      value={classColumn}
                      onChange={(e) =>
                        setClassColumn(e.target.value.replace(/\D/g, ""))
                      }
                      inputMode="numeric"
                      className="mt-1 w-16 px-2 py-1.5 border border-hairline rounded text-sm"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs text-danger-text">
              {error}
            </p>
          )}
        </div>

        <div className="px-4 sm:px-6 py-3 border-t border-hairline flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-4 rounded-lg border border-hairline text-sm"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!ws}
            onClick={buildPreview}
            className="min-h-11 px-4 rounded-lg bg-accent-text text-white text-sm font-medium hover:bg-accent-hover transition disabled:opacity-50"
          >
            写入并预览
          </button>
        </div>
      </div>
    </div>
  );
}
