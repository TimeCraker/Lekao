"use client";

import { useEffect, useRef, useState } from "react";
import { useDialogA11y } from "@/lib/hooks/dialog-a11y";
import { cn } from "@/lib/utils";
import { CloseIcon, RefreshIcon } from "@/components/icons";
import {
  describeDocxSummary,
  renderDocxInto,
  summarizeDocx,
  type DocxSummary,
} from "@/lib/deliver/docx-render";
import { printElement } from "@/lib/deliver/print-view";
import type { SheetGrid } from "@/lib/deliver/render-types";

/**
 * S04 T-401 · 交付预览面板
 *
 * - docx：打开时才动态加载 docx-preview 渲染真实字节（重依赖不进首屏，NFR-010）
 * - xlsx：调用方传入 buildSheetGrid 的纯模型，组件只负责画表格（样式/合并/列宽与导出件同源）
 * - 失败不留空白：显示产物摘要 + 重试按钮；文件本身仍可下载
 * - 弹层可访问性：焦点陷阱 + Esc + 关闭还焦（useDialogA11y）
 */
export type ArtifactPreviewProps =
  | {
      kind: "docx";
      open: boolean;
      onClose: () => void;
      blob: Blob;
      fileName?: string;
      title?: string;
      /** 预览侧的可编辑区（S04 T-402：预览即编辑，编辑走源模型再重建产物） */
      editor?: React.ReactNode;
      /** 底部动作区（下载 / 打印等） */
      actions?: React.ReactNode;
      /** 底栏左侧摘要（缺省用产物自动摘要） */
      summary?: string;
    }
  | {
      kind: "xlsx";
      open: boolean;
      onClose: () => void;
      grid: SheetGrid;
      fileName?: string;
      title?: string;
      editor?: React.ReactNode;
      actions?: React.ReactNode;
      summary?: string;
    };

type DocxRenderState =
  | { status: "loading" }
  | { status: "ready"; summary?: DocxSummary }
  | { status: "failed"; message: string; summary?: DocxSummary };

export function ArtifactPreview(props: ArtifactPreviewProps) {
  const { open, onClose, fileName, title, editor, actions, summary } = props;
  const dialogRef = useDialogA11y({ open, onClose });
  const bodyRef = useRef<HTMLDivElement>(null);
  const [docxState, setDocxState] = useState<DocxRenderState | null>(null);
  const [attempt, setAttempt] = useState(0);

  const isDocx = props.kind === "docx";
  const docxBlob = props.kind === "docx" ? props.blob : null;

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open || !isDocx || !docxBlob) return;
    let cancelled = false;

    // 0ms 调度：把「会 setState 的异步渲染」移出 effect 同步路径
    // （react-hooks/set-state-in-effect；与 template-picker 同款处理）
    const timer = setTimeout(() => {
      void (async () => {
        setDocxState({ status: "loading" });

        // 摘要先出，失败时可直接复用（不重复解析字节）
        let summary: DocxSummary | undefined;
        try {
          summary = await summarizeDocx(docxBlob);
        } catch {
          summary = undefined;
        }
        if (cancelled) return;

        const container = bodyRef.current;
        if (!container) return;
        container.innerHTML = "";
        try {
          await renderDocxInto(docxBlob, { container, breakPages: true });
          if (!cancelled) setDocxState({ status: "ready", summary });
        } catch (err) {
          if (!cancelled) {
            setDocxState({
              status: "failed",
              message: err instanceof Error ? err.message : "渲染失败",
              summary,
            });
          }
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // attempt 变化 = 用户点击重试；blob 引用稳定，父组件重渲染不会重复渲染
  }, [open, attempt, isDocx, docxBlob]);

  if (!open) return null;

  const heading = title ?? (isDocx ? "Word 预览" : "Excel 预览");

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
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-hairline">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink truncate">
              {heading}
            </h2>
            {fileName && (
              <p className="text-xs text-ink-subtle truncate">{fileName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭预览"
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-md text-ink-muted hover:text-ink hover:bg-canvas-alt transition"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {editor && (
            <div className="shrink-0 sm:w-[300px] max-h-[35vh] sm:max-h-none overflow-auto border-b sm:border-b-0 sm:border-r border-hairline bg-white">
              {editor}
            </div>
          )}

          <div
            ref={bodyRef}
            className="flex-1 overflow-auto bg-canvas-alt/40 px-2 sm:px-6 py-4"
            aria-live="polite"
          >
            {isDocx &&
              (docxState === null || docxState.status === "loading") && (
                <div className="py-16 text-center text-sm text-ink-subtle">
                  正在渲染真实排版…
                </div>
              )}

            {isDocx && docxState?.status === "failed" && (
              <div className="mx-auto max-w-xl my-8 rounded-xl border border-hairline bg-white p-6 space-y-3">
                <p className="text-sm font-medium text-danger-text">
                  预览渲染失败：{docxState.message}
                </p>
                {docxState.summary && (
                  <p className="text-xs text-ink-muted break-all">
                    {describeDocxSummary(docxState.summary, fileName)}
                  </p>
                )}
                <p className="text-xs text-ink-subtle">
                  文件本身仍可下载；也可以重试渲染。
                </p>
                <button
                  type="button"
                  onClick={() => setAttempt((n) => n + 1)}
                  className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg bg-accent-text text-white text-sm font-medium hover:bg-accent-hover transition"
                >
                  <RefreshIcon className="w-4 h-4" />
                  重试渲染
                </button>
              </div>
            )}

            {props.kind === "xlsx" && <SheetGridTable grid={props.grid} />}
          </div>
        </div>

        <div className="px-4 sm:px-6 py-2 border-t border-hairline bg-canvas-alt/40 flex items-center justify-between gap-3">
          <span className="text-xs text-ink-subtle min-w-0 truncate">
            {summary ??
              (props.kind === "xlsx"
                ? `${props.grid.name}：${props.grid.rowCount} 行 × ${props.grid.colCount} 列，${props.grid.merges.length} 处合并`
                : docxState?.status === "ready" && docxState.summary
                  ? describeDocxSummary(docxState.summary, fileName)
                  : null)}
          </span>
          <span className="flex items-center gap-2 shrink-0">
            {/* S04 T-405：打印 / 另存 PDF（所有产物共用；PDF 走打印对话框） */}
            <button
              type="button"
              onClick={() => {
                if (bodyRef.current) {
                  printElement(bodyRef.current, heading);
                }
              }}
              title="在打印对话框选择「另存为 PDF / 存储为 PDF」即可得到 PDF 文件"
              className="min-h-9 px-3 rounded-lg border border-hairline text-xs text-ink-muted hover:text-ink hover:bg-canvas-alt transition"
            >
              打印 / 另存 PDF
            </button>
            {actions}
          </span>
        </div>
      </div>
    </div>
  );
}

/** 纯渲染：把 SheetGrid 画成表格（合并/列宽/样式与导出件同源） */
export function SheetGridTable({ grid }: { grid: SheetGrid }) {
  return (
    <table className="mx-auto border-collapse bg-white text-[13px] text-ink">
      <colgroup>
        {grid.colWidths.map((w, i) => (
          <col
            key={i}
            style={{ width: w ? `${Math.round(w * 7.5)}px` : "72px" }}
          />
        ))}
      </colgroup>
      <tbody>
        {grid.rows.map((row, r) => (
          <tr
            key={r}
            style={{
              height: grid.rowHeights[r]
                ? `${grid.rowHeights[r]}px`
                : undefined,
            }}
          >
            {row.map((cell, c) => {
              if (cell.isMergedAway) return null;
              const span = grid.merges.find((m) => m.top === r && m.left === c);
              return (
                <td
                  key={c}
                  colSpan={span ? span.right - span.left + 1 : 1}
                  rowSpan={span ? span.bottom - span.top + 1 : 1}
                  className={cn(
                    "border border-hairline px-2 py-1 align-middle",
                    cell.bold && "font-semibold",
                    cell.italic && "italic",
                  )}
                  style={{
                    textAlign: cell.align,
                    whiteSpace: cell.wrap ? "pre-wrap" : "nowrap",
                    fontSize: cell.fontSize ? `${cell.fontSize}px` : undefined,
                  }}
                >
                  {cell.text}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
