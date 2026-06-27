/**
 * 周末错题反馈表 · R2 表头字段识别（v0.4 · 用户 2026-06-27 反馈重构）
 *
 * 来源：用户实测发现代码硬编码列位置（B=姓名、C=错题、D=反馈）导致：
 *   1. 新模板（5 列 A/B/C/D/E，反馈在 E 列）导出会写错位置
 *   2. 旧模板（4 列，反馈在 D 列）反馈丢失
 *   3. 用户上传时手填的 C 列错题 / D-E 列反馈被丢弃（parser 不读）
 *
 * 解决：用 R2 列头字符串动态识别列号，不再硬编码。
 *
 * 匹配规则（用户确认，2026-06-27）：
 * - 含「反馈」/「评语」/「意见」等 → 反馈列（最高优先级，避免「课后作业反馈」被识别成错题）
 * - 含「姓名」/「学生」/「学员」 → 姓名列
 * - 含「序号」/「编号」 → 序号列
 * - 含「堂测」/「课堂」/「小测」 → 堂测错题列（错题2）
 * - 含「作业」/「课后」/「练习」 → 作业错题列（错题1）
 *
 * 降级：找不到姓名列时用默认 { serial: 1, name: 2, qNumbersCols: [3], feedback: 4 }
 */

import type { FieldColumnMap } from "./weekend-types-base";

export type FieldKey = "serial" | "name" | "qHomework" | "qClass" | "feedback";

/** 字段匹配别名表（按匹配优先级排序）*/
const FIELD_ALIASES: Record<FieldKey, readonly string[]> = {
  // ⭐ Stage 11：补全评价/评/点评/总评/小评等常见反馈列名
  //   物理模板用「练习评价」、化学可能用「课堂点评」「总评」「小评」等
  //   用户原话："后面可能有多个 sheets 所以这个应该是全局通用的"
  //   关键词表必须能覆盖所有学科（数学/物理/化学/生物/英语...）
  feedback: [
    "反馈", "评价", "评语", "总评", "点评", "小评",
    "意见", "建议", "总结", "老师评", "教师评", "评讲",
  ],
  name: ["姓名", "学生", "学员"],
  serial: ["序号", "编号", "#", "No", "no", "Number"],
  qClass: ["堂测", "课堂", "小测"],
  qHomework: ["作业", "课后", "练习"],
};

/**
 * 匹配单个列头字符串 → 字段类型
 *
 * 优先级：feedback > name > serial > qClass > qHomework
 * （feedback 最优先避免「课后作业反馈」误识别为 qHomework）
 */
export function matchField(headerText: string): FieldKey | null {
  const t = String(headerText ?? "").trim();
  if (!t) return null;

  // 按优先级顺序匹配（先 feedback）
  if (FIELD_ALIASES.feedback.some((a) => t.includes(a))) return "feedback";
  if (FIELD_ALIASES.name.some((a) => t.includes(a))) return "name";
  if (FIELD_ALIASES.serial.some((a) => t.includes(a))) return "serial";
  if (FIELD_ALIASES.qClass.some((a) => t.includes(a))) return "qClass";
  if (FIELD_ALIASES.qHomework.some((a) => t.includes(a))) return "qHomework";

  return null;
}

/**
 * 默认列布局（降级用 · 兼容老 4 列模板）
 */
export const DEFAULT_FIELD_COLUMNS: FieldColumnMap = {
  serial: 1,
  name: 2,
  qNumbersCols: [3],
  feedback: 4,
};

/**
 * 解析 R2 表头数组 → FieldColumnMap
 *
 * @param row2 R2 列头数组（rows[1]）
 * @returns 列布局映射
 */
export function parseR2Headers(row2: unknown[]): FieldColumnMap {
  const map: FieldColumnMap = {
    serial: null,
    name: -1,
    qNumbersCols: [],
    feedback: null,
  };

  const qHomeworkCols: number[] = [];

  for (let c = 0; c < row2.length; c++) {
    const field = matchField(String(row2[c] ?? ""));
    if (!field) continue;
    const col = c + 1; // 1-based
    if (field === "serial") {
      if (map.serial === null) map.serial = col;
    } else if (field === "name") {
      if (map.name === -1) map.name = col;
    } else if (field === "feedback") {
      if (map.feedback === null) map.feedback = col;
    } else if (field === "qClass") {
      if (!map.qNumbersCols.includes(col)) map.qNumbersCols.push(col);
    } else if (field === "qHomework") {
      qHomeworkCols.push(col);
    }
  }

  // qHomework 放前面（错题1），qClass 放后面（错题2）
  map.qNumbersCols = [...qHomeworkCols, ...map.qNumbersCols];

  // 兜底：name 找不到 → 降级默认
  if (map.name < 0) {
    return { ...DEFAULT_FIELD_COLUMNS };
  }

  // qNumbersCols 全空 → 至少给一列默认（C 列）
  if (map.qNumbersCols.length === 0) {
    map.qNumbersCols = [DEFAULT_FIELD_COLUMNS.qNumbersCols[0]];
  }

  return map;
}

/**
 * 读取单元格值的辅助（避免 undefined → "" + trim）
 */
export function readCell(row: unknown[], col: number | null): string {
  if (col === null || col === undefined || col < 1) return "";
  const v = row[col - 1];
  return v === null || v === undefined ? "" : String(v).trim();
}