"use client";

import { saveAs } from "file-saver";
import type { SheetGrid } from "@/lib/deliver/render-types";
import {
  DEFAULT_ACTION_LABELS,
  resolveDeliveryActions,
  resolveDeliveryState,
  type DeliveryActionId,
} from "@/lib/deliver/delivery-contract";
import { ArtifactPreview } from "@/components/deliver/artifact-preview";

/**
 * S04 T-406 · 统一交付面板（对外契约，冻结供 S03 T-305 挂载）
 *
 * 五个动作：下载 / 打印 / 批量 / 重新编辑 / 历史
 * 五种状态：loading / ready / failed / editing / empty
 *
 * 契约设计：
 * - 状态机与动作矩阵在 `@/lib/deliver/delivery-contract`（纯逻辑、已单测锁定），
 *   本组件只做组合；S03 改 UI 不改语义；
 * - 预览主体复用 ArtifactPreview（docx 真实渲染 / xlsx 同源网格），打印由其内置按钮承担；
 * - 下载缺省实现 = saveAs(blob, fileName)（docx）；xlsx 的调用方自己产 Blob（workbookToBlob）。
 *
 * 产物不出浏览器：所有动作都是本地 Blob / 打印对话框 / File System Access，无网络上传。
 */
export type {
  DeliveryActionId,
  DeliveryState,
} from "@/lib/deliver/delivery-contract";

export interface DeliveryPanelProps {
  kind: "docx" | "xlsx";
  open: boolean;
  onClose: () => void;
  /** docx 产物字节（kind=docx 必填） */
  blob?: Blob;
  /** xlsx 表样模型（kind=xlsx 必填） */
  grid?: SheetGrid;
  fileName?: string;
  title?: string;
  /** 预览侧编辑区（挂了即为 editing 态） */
  editor?: React.ReactNode;
  /** 底栏左侧摘要文案 */
  summary?: string;
  /** 生成/构建失败的信息（failed 态的面板内提示） */
  failedMessage?: string;
  onDownload?: () => void;
  onBatch?: () => void;
  onReedit?: () => void;
  onHistory?: () => void;
  labels?: Partial<Record<DeliveryActionId, string>>;
}

/**
 * 统一交付面板：把 ArtifactPreview 与五个动作组成冻结的交付面。
 * 本面板只负责「内容就绪后」的看 → 改 → 交付；生成中/失败的调用方外壳
 * 用 resolveDeliveryState 判定状态后自行渲染（各自有更具体的文案）。
 */
export function DeliveryPanel(props: DeliveryPanelProps) {
  const {
    kind,
    open,
    onClose,
    blob,
    grid,
    fileName,
    title,
    editor,
    summary,
    onDownload,
    onBatch,
    onReedit,
    onHistory,
    labels,
  } = props;

  const ready = kind === "docx" ? Boolean(blob) : Boolean(grid);
  if (!open || !ready) return null;

  const state = resolveDeliveryState({
    ready,
    failed: false,
    building: false,
    hasEditor: Boolean(editor),
    hasContent: true,
  });
  const canDownload =
    kind === "docx" ? Boolean(blob && fileName) : Boolean(onDownload);
  const actionIds = resolveDeliveryActions({
    state,
    canDownload,
    onBatch,
    onReedit,
    onHistory,
  });
  const mergedLabels = { ...DEFAULT_ACTION_LABELS, ...labels };

  function runAction(id: DeliveryActionId) {
    switch (id) {
      case "download":
        if (onDownload) {
          onDownload();
        } else if (kind === "docx" && blob && fileName) {
          saveAs(blob, fileName);
        }
        break;
      case "batch":
        onBatch?.();
        break;
      case "reedit":
        onReedit?.();
        break;
      case "history":
        onHistory?.();
        break;
      default:
        // print 由 ArtifactPreview 内置按钮承担，这里不重复渲染
        break;
    }
  }

  return (
    <ArtifactPreview
      open={open}
      onClose={onClose}
      fileName={fileName}
      title={title}
      editor={editor}
      {...(kind === "docx"
        ? { kind: "docx" as const, blob: blob as Blob }
        : { kind: "xlsx" as const, grid: grid as SheetGrid })}
      summary={summary}
      actions={
        <>
          {actionIds
            .filter((id) => id !== "print")
            .map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => runAction(id)}
                className={
                  id === "download"
                    ? "min-h-11 px-4 rounded-lg bg-accent-text text-white text-sm font-medium hover:bg-accent-hover transition"
                    : "min-h-11 px-3 rounded-lg border border-hairline text-sm text-ink-muted hover:text-ink hover:bg-canvas-alt transition"
                }
              >
                {mergedLabels[id]}
              </button>
            ))}
        </>
      }
    />
  );
}
