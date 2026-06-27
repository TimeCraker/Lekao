/**
 * 周末错题反馈表 · 基础类型（拆出来避免 types.ts 循环引用）
 */

/**
 * ⭐ Stage 6：用 R2 表头识别的字段列号映射
 *
 * 列号 1-based（A=1, B=2, ...）
 *
 * 用户实测反馈（2026-06-27）：旧实现硬编码 B=姓名/C=错题/D=反馈，
 * 导致新模板（5 列反馈在 E 列）导出位置错误。改为表头动态识别。
 */
export interface FieldColumnMap {
  /** 序号列号（null = 未找到）*/
  serial: number | null;
  /** 姓名列号（必填）*/
  name: number;
  /** 错题列号列表（按 R2 顺序），如 [3, 4] = C+D 都是错题 */
  qNumbersCols: number[];
  /** 反馈列号（null = 未找到）*/
  feedback: number | null;
}

/**
 * ⭐ Stage 6.5：根据 R2 表头原文，生成 UI 列标签
 *
 * - qNumbersCols 有 1 列 → ["错题"]
 * - qNumbersCols 有 2 列 → ["作业错题", "堂测错题"]（按 R2 原文顺序）
 * - 找不到对应 R2 文本 → 兜底 ["错题 1", "错题 2"]
 */
export function getQNumberLabels(
  fieldColumns: FieldColumnMap,
  rawR2: unknown[] | undefined,
): string[] {
  const labels: string[] = [];
  for (let i = 0; i < fieldColumns.qNumbersCols.length; i++) {
    const col = fieldColumns.qNumbersCols[i];
    const headerText =
      rawR2 && col >= 1 && col - 1 < rawR2.length
        ? String(rawR2[col - 1] ?? "").trim()
        : "";
    if (headerText) {
      labels.push(headerText);
    } else {
      labels.push(i === 0 ? "错题" : `错题 ${i + 1}`);
    }
  }
  return labels;
}

export interface WeekendStudent {
  rowIndex: number;        // 在 Sheet 中的行号（用于追溯）
  serialNumber: string;    // 序号列（可空字符串）
  name: string;            // 姓名列
  /** 错题1 列（题号/特殊值）：
   *  - 题号 "3，6"
   *  - 特殊值 "全对" / "网课" / "网课回放" / "上次课网课" / "作业未交"
   *  - 其他文本（用户填）
   *  - 留空 */
  qNumbersInput: string;
  /** ⭐ Stage 6：错题2 列（如果有第二列错题，如"堂测错题"）*/
  qNumbersInput2?: string;
  /** 反馈列（AI 生成 / 手动填） */
  feedback: string;
}

export interface WeekendSheet {
  sheetName: string;
  originalTitle: string;
  updatedTitle: string;
  classroomHint: string;
  detectedDate: string | null;
  newDate: string;
  students: WeekendStudent[];
  rawRows: unknown[][];
  cols: number;
  /** ⭐ Stage 6：R2 表头识别的字段列号映射（导出时用）*/
  fieldColumns: FieldColumnMap;
  /**
   * ⭐ Stage 5.2：标记此 sheet 是在浏览器里新增的（不在原 Excel 里）。
   * 导出时需要从 sourceSheetName 复制样式创建新 worksheet。
   * 加载已有 Excel 时不设此字段。
   */
  sourceSheetName?: string;
  /** ⭐ Stage 5.2：是否新增 sheet（true 时导出时 clone 样式）*/
  isNewSheet?: boolean;
}

export interface WeekendWorkbook {
  fileName: string;
  fileHash: string;
  sheets: WeekendSheet[];
}

export interface WeekendDraft {
  /** ⭐ Stage 6：草稿 schema 版本（老草稿没此字段视为 v0，load 时忽略）*/
  schemaVersion?: number;
  fileHash: string;
  fileName: string;
  sheetName: string;
  students: WeekendStudent[];
  updatedTitle: string;
  newDate: string;
  savedAt: number;
}

/** 当前草稿 schema 版本 */
export const WEEKEND_DRAFT_SCHEMA_VERSION = 1;

export type WeekendStep =
  | "upload"
  | "editDate"
  | "editStudents"
  | "aiFeedback"
  | "export";

/** 单 Sheet 60 人上限（用户 2026-06-26 确认）*/
export const WEEKEND_STUDENT_LIMIT = 60;