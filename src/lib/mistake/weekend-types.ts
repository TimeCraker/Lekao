/**
 * 周末错题反馈表 · 全部数据结构（v0.2 简化版）
 * 来源：docs/stages/weekend-mistake-table-v0.md + 用户 2026-06-26 反馈
 *
 * v0.2 关键简化（vs v0.1）：
 * - C 列去掉 dropdown 拆分，改为单一字符串（跟模板 C 列 1:1 对应）
 * - 特殊情况通过 classifyCellValue() 函数识别（运行时分类，不存 status 字段）
 * - 学生按 C 列值自动排序：有题号(数字升序) → 全对 → 网课 → 作业未交 → 其他 → 留空
 */

import type { WeekendStudent } from "./weekend-types-base";

// ============== 单元格分类（运行时） ==============

/** C 列值分类（运行时识别，不存数据库） */
export type CellCategory =
  | "qnumber"      // 题号（"3，6" / "1，2，5，6"）
  | "allCorrect"   // 全对
  | "onlineCourse" // 网课
  | "onlineReview" // 网课回放
  | "onlineLast"   // 上次课网课
  | "notSubmitted" // 作业未交
  | "other"        // 其他文本（用户填的医院/转学 等）
  | "blank";       // 留空

/** 快捷插入的特殊值（UI 按钮组） */
export const QUICK_FILL_OPTIONS: ReadonlyArray<{
  value: string;
  category: CellCategory;
  label: string;
}> = [
  { value: "全对", category: "allCorrect", label: "全对" },
  { value: "网课", category: "onlineCourse", label: "网课" },
  { value: "网课回放", category: "onlineReview", label: "网课回放" },
  { value: "上次课网课", category: "onlineLast", label: "上次课网课" },
  { value: "作业未交", category: "notSubmitted", label: "作业未交" },
];

/**
 * 分类 C 列字符串值
 *
 * 规则：
 * - 空字符串 / 全空白 → "blank"
 * - 精确匹配特殊值 → 对应 category
 * - 含数字 → "qnumber"
 * - 其他文本 → "other"
 */
export function classifyCellValue(value: string): CellCategory {
  const v = value.trim();
  if (!v) return "blank";

  // 精确匹配特殊值（避免误识 "网课" 出现在题号里）
  if (v === "全对") return "allCorrect";
  if (v === "网课") return "onlineCourse";
  if (v === "网课回放") return "onlineReview";
  if (v === "上次课网课") return "onlineLast";
  if (v === "作业未交") return "notSubmitted";

  // 含数字 → 题号
  if (/[\d]/.test(v)) return "qnumber";

  return "other";
}

/**
 * AI 反馈是否要跳过这行（特殊情况 = 跳过，blank = 跳过）
 * Stage 3 使用：第一个不跳过的位置填"本次作业总体小结"
 */
export function shouldSkipAiFeedback(category: CellCategory): boolean {
  return (
    category === "onlineCourse" ||
    category === "onlineReview" ||
    category === "onlineLast" ||
    category === "notSubmitted" ||
    category === "other" ||
    category === "blank"
  );
}

// ============== 自动排序 ==============

/** 排序优先级（数字越小越靠前） */
const CATEGORY_ORDER: Record<CellCategory, number> = {
  qnumber: 0,
  allCorrect: 1,
  onlineCourse: 2,
  onlineReview: 3,
  onlineLast: 4,
  notSubmitted: 5,
  other: 6,
  blank: 7,
};

/** 从题号字符串里提取第一个数字，用于 qnumber 之间的排序 */
function extractFirstNumber(value: string): number {
  const m = value.match(/\d+/);
  return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
}

/**
 * 按 C 列值自动排序学生
 *
 * 排序规则：
 * 1. 题号(数字升序) → 全对 → 网课 → 网课回放 → 上次课网课 → 作业未交 → 其他 → 留空
 * 2. 同类别：题号按首个数字升序，其他按姓名拼音升序
 *
 * 不修改原数组，返回新数组
 */
export function sortStudentsByCellValue(students: WeekendStudent[]): WeekendStudent[] {
  return [...students].sort((a, b) => {
    const ca = classifyCellValue(a.qNumbersInput);
    const cb = classifyCellValue(b.qNumbersInput);

    const orderDiff = CATEGORY_ORDER[ca] - CATEGORY_ORDER[cb];
    if (orderDiff !== 0) return orderDiff;

    // 同类别细分排序
    if (ca === "qnumber") {
      const na = extractFirstNumber(a.qNumbersInput);
      const nb = extractFirstNumber(b.qNumbersInput);
      if (na !== nb) return na - nb;
    }
    return a.name.localeCompare(b.name, "zh-CN");
  });
}

// ============== 导出共享类型（防止循环引用） ==============

export type { WeekendStudent, WeekendSheet, WeekendWorkbook, WeekendDraft, WeekendStep, FieldColumnMap } from "./weekend-types-base";
export { WEEKEND_STUDENT_LIMIT, WEEKEND_DRAFT_SCHEMA_VERSION, getQNumberLabels } from "./weekend-types-base";