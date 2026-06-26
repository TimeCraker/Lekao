/**
 * 周末错题反馈表 · 全部数据结构
 * 来源：docs/stages/weekend-mistake-table-v0.md
 *
 * 关键差异 vs 现有 mistake 模块：
 * - mistake 是"姓名 + 堂测错题号列表 + 作业错题号列表"（自动解析）
 * - weekend 是"姓名 + C 列（错题字符串 · 用户手动填）+ D 列（反馈 · AI/手动）"
 * - weekend 不依赖图片槽位（讲义图全班共用 1 张）
 *
 * 特殊情况状态（用户 2026-06-26 确认）：完全按模板实际值
 * - normal / allCorrect / onlineCourse / onlineReview / onlineLast / notSubmitted / other
 */

// ============== 特殊情况枚举 ==============

/** 特殊情况状态值（7 种） */
export type WeekendStatus =
  | "normal"        // 正常
  | "allCorrect"    // 全对
  | "onlineCourse"  // 网课
  | "onlineReview"  // 网课回放
  | "onlineLast"    // 上次课网课
  | "notSubmitted"  // 作业未交
  | "other";        // 其他（填文本）

/** 状态选项（UI dropdown） */
export const WEEKEND_STATUS_OPTIONS: ReadonlyArray<{
  value: WeekendStatus;
  label: string;
  /** 锁定错题 input（true = 不可填）*/
  lockQNumbers: boolean;
  /** 跳过 AI 反馈（true = 不生成 D 列）*/
  skipAiFeedback: boolean;
}> = [
  { value: "normal", label: "正常", lockQNumbers: false, skipAiFeedback: false },
  { value: "allCorrect", label: "全对", lockQNumbers: true, skipAiFeedback: false },
  { value: "onlineCourse", label: "网课", lockQNumbers: true, skipAiFeedback: true },
  { value: "onlineReview", label: "网课回放", lockQNumbers: true, skipAiFeedback: true },
  { value: "onlineLast", label: "上次课网课", lockQNumbers: true, skipAiFeedback: true },
  { value: "notSubmitted", label: "作业未交", lockQNumbers: true, skipAiFeedback: true },
  { value: "other", label: "其他...", lockQNumbers: true, skipAiFeedback: true },
] as const;

/** 根据 value 找 label */
export function getStatusLabel(value: WeekendStatus): string {
  return WEEKEND_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? "未知";
}

/** 根据 value 找是否锁定错题 */
export function isQNumbersLocked(value: WeekendStatus): boolean {
  return WEEKEND_STATUS_OPTIONS.find((o) => o.value === value)?.lockQNumbers ?? false;
}

/** 根据 value 找是否跳过 AI */
export function isAiFeedbackSkipped(value: WeekendStatus): boolean {
  return WEEKEND_STATUS_OPTIONS.find((o) => o.value === value)?.skipAiFeedback ?? false;
}

// ============== 学生行 ==============

/**
 * 周末表格的单个学生行
 * - serialNumber: A 列序号（可空，可能是学号 / 座位号）
 * - status + statusNote: 特殊情况 dropdown + "其他"的文本
 * - qNumbersInput: C 列用户手动填的错题（字符串，逗号分隔）
 * - feedback: D 列反馈（AI 生成 / 用户手动填）
 */
export interface WeekendStudent {
  rowIndex: number;        // 在 Sheet 中的行号（用于追溯）
  serialNumber: string;    // A 列（可空字符串）
  name: string;            // B 列
  status: WeekendStatus;   // 用户当前选择的状态（默认 normal）
  statusNote: string;      // status=other 时的文本
  qNumbersInput: string;   // C 列错题（用户手动填，如 "3，6"）
  feedback: string;        // D 列反馈（AI / 手动）
}

// ============== Sheet 解析结果 ==============

/** 单个 Sheet 解析结果 */
export interface WeekendSheet {
  sheetName: string;           // Sheet 名（如 "超火1班数学"）
  originalTitle: string;       // R1 原始标题（如 "2026超火1班数学反馈表 6月14日"）
  updatedTitle: string;        // 改完日期的标题
  classroomHint: string;       // 从 Sheet 名提取的班级+学科（如 "超火1班数学"）
  detectedDate: string | null; // R1 识别出的日期（ISO YYYY-MM-DD，可能为 null）
  newDate: string;             // 本周日期（ISO）
  students: WeekendStudent[];
  rawRows: unknown[][];        // 原始 Sheet 数据（导出时保留）
  cols: number;                // Sheet 列数（保留 9 列宽等特殊格式）
}

// ============== 工作簿 ==============

/** 整个周末工作簿 */
export interface WeekendWorkbook {
  fileName: string;     // 用户上传的文件名
  fileHash: string;     // 文件内容的 hash（用于 localStorage 草稿 key）
  sheets: WeekendSheet[];
}

// ============== 草稿 ==============

/** localStorage 草稿（按 Sheet 独立存储）*/
export interface WeekendDraft {
  fileHash: string;
  fileName: string;
  sheetName: string;
  students: WeekendStudent[];
  updatedTitle: string;
  newDate: string;
  savedAt: number;
}

// ============== 步骤状态机 ==============

export type WeekendStep =
  | "upload"          // 上传 Excel
  | "editDate"        // 改 R1 表头日期
  | "editStudents"     // 编辑学生表
  | "aiFeedback"       // AI 反馈（Stage 3 实现）
  | "export";          // 导出 Excel（Stage 2 实现）

/** 单 Sheet 60 人上限（用户 2026-06-26 确认）*/
export const WEEKEND_STUDENT_LIMIT = 60;