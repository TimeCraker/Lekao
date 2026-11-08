/**
 * S04 T-406 · 统一交付面板的对外契约（冻结，供 S03 T-305 挂载）
 *
 * 纯逻辑、无 JSX：状态机与动作矩阵抽在这里，组件（delivery-panel.tsx）只做组合。
 * S03 改视觉不改语义 —— 这份文件就是语义。
 */

export type DeliveryActionId =
  "download" | "print" | "batch" | "reedit" | "history";

export type DeliveryState =
  "loading" | "ready" | "failed" | "editing" | "empty";

export interface DeliveryStateInput {
  /** 产物是否已就绪 */
  ready: boolean;
  /** 是否处于失败态 */
  failed: boolean;
  /** 是否仍在生成 */
  building: boolean;
  /** 是否挂了编辑区（预览即编辑） */
  hasEditor: boolean;
  /** 是否有可交付的内容（无内容的空态） */
  hasContent: boolean;
}

/** 状态机：优先级 失败 > 生成中 > 空 > 编辑中(就绪+编辑区) > 就绪 */
export function resolveDeliveryState(input: DeliveryStateInput): DeliveryState {
  if (input.failed) return "failed";
  if (input.building) return "loading";
  if (!input.hasContent) return "empty";
  if (input.ready && input.hasEditor) return "editing";
  return "ready";
}

export interface DeliveryActionsInput {
  state: DeliveryState;
  /** 是否有可下载的产物字节（docx Blob 或调用方自产下载器） */
  canDownload: boolean;
  onBatch?: () => void;
  onReedit?: () => void;
  onHistory?: () => void;
}

/** 动作矩阵：非就绪态只有重新编辑可用（回到源模型修数据）；其余动作挂了才显示 */
export function resolveDeliveryActions(
  input: DeliveryActionsInput,
): DeliveryActionId[] {
  const actionable = input.state === "ready" || input.state === "editing";
  const actions: DeliveryActionId[] = [];
  if (actionable && input.canDownload) actions.push("download");
  if (actionable) actions.push("print");
  if (actionable && input.onBatch) actions.push("batch");
  if (input.onReedit) actions.push("reedit");
  if (actionable && input.onHistory) actions.push("history");
  return actions;
}

export const DEFAULT_ACTION_LABELS: Record<DeliveryActionId, string> = {
  download: "下载",
  print: "打印 / 另存 PDF",
  batch: "批量交付",
  reedit: "重新编辑",
  history: "历史",
};
