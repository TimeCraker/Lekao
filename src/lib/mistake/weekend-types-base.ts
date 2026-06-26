/**
 * 周末错题反馈表 · 基础类型（拆出来避免 types.ts 循环引用）
 */

export interface WeekendStudent {
  rowIndex: number;        // 在 Sheet 中的行号（用于追溯）
  serialNumber: string;    // A 列（可空字符串）
  name: string;            // B 列
  /** C 列（统一字符串）：
   *  - 题号 "3，6"
   *  - 特殊值 "全对" / "网课" / "网课回放" / "上次课网课" / "作业未交"
   *  - 其他文本（用户填）
   *  - 留空 */
  qNumbersInput: string;
  /** D 列反馈（AI 生成 / 手动填） */
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
}

export interface WeekendWorkbook {
  fileName: string;
  fileHash: string;
  sheets: WeekendSheet[];
}

export interface WeekendDraft {
  fileHash: string;
  fileName: string;
  sheetName: string;
  students: WeekendStudent[];
  updatedTitle: string;
  newDate: string;
  savedAt: number;
}

export type WeekendStep =
  | "upload"
  | "editDate"
  | "editStudents"
  | "aiFeedback"
  | "export";

/** 单 Sheet 60 人上限（用户 2026-06-26 确认）*/
export const WEEKEND_STUDENT_LIMIT = 60;