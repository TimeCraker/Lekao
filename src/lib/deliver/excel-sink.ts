/**
 * S04 T-404 · Excel 落版器（AI 产出直接写进教师自有表格）
 *
 * 目标场景：老师有自己格式的反馈表；课堂小结/作业反馈生成后，
 * 过去要「复制 → 打开 Office → 粘贴」，现在直接按表头语义写进他的表并预览导出。
 *
 * 设计要点：
 * - 列定位复用既有 `parseR2Headers`（表头关键词识别），识别不到时允许人手点列
 * - 匹配规则保守：目标表里**同名多行**不猜（标 duplicate）、表里没有的姓名不写（标 missing）、
 *   目标单元格落在**非锚点合并区**时也不写（标 merged，交人工处理）
 * - 写入只动目标单元格的值与换行/对齐，不重排列宽行高、不重建 sheet（尊重老师的模板）
 * - 纯逻辑：输入 exceljs Worksheet，输出计划与写入结果，可在 vitest 里对真实 Workbook 断言
 */

import type ExcelJS from "exceljs";
import { matchField, parseR2Headers } from "@/lib/mistake/weekend-headers";
import type { FieldColumnMap } from "@/lib/mistake/weekend-types-base";

export interface SinkStudentInput {
  name: string;
  text: string;
}

export type SinkUnmatchedReason =
  "empty_name" | "missing" | "duplicate" | "merged" | "no_column";

export interface SinkMatch {
  /** Excel 行号（1 基） */
  row: number;
  name: string;
  /** Excel 列号（1 基） */
  column: number;
  text: string;
}

export interface SinkPlan {
  sheetName: string;
  columns: FieldColumnMap;
  /** 反馈列来源：自动按表头识别 or 人工指定 */
  columnSource: "header" | "manual" | "none";
  feedbackColumn: number | null;
  nameColumn: number | null;
  matches: SinkMatch[];
  unmatched: { name: string; reason: SinkUnmatchedReason }[];
}

export interface SinkOptions {
  /** 人工指定反馈列（1 基）；给了就覆盖表头识别结果 */
  manualFeedbackColumn?: number;
  /** 数据起始行（默认 3，与常见反馈表一致：R1 标题 / R2 表头 / R3 起学生） */
  firstDataRow?: number;
}

/** "A1" / "A1:B2" → 0 基矩形 */
function mergeRangeOf(range: string) {
  const [start, end = start] = range.split(":");
  const dec = (ref: string) => {
    const m = ref.match(/^([A-Z]+)(\d+)$/);
    if (!m) return null;
    let col = 0;
    for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
    return { row: Number(m[2]) - 1, col: col - 1 };
  };
  const s = dec(start);
  const e = dec(end);
  if (!s || !e) return null;
  return {
    top: Math.min(s.row, e.row),
    left: Math.min(s.col, e.col),
    bottom: Math.max(s.row, e.row),
    right: Math.max(s.col, e.col),
  };
}

/** 目标单元格是否落在「非锚点」的合并区里（写进去会被 Excel 丢弃） */
function isMergedAway(
  ws: ExcelJS.Worksheet,
  row: number,
  col: number,
): boolean {
  const merges = (ws.model?.merges ?? []) as string[];
  for (const range of merges) {
    const m = mergeRangeOf(range);
    if (!m) continue;
    const r = row - 1;
    const c = col - 1;
    if (r >= m.top && r <= m.bottom && c >= m.left && c <= m.right) {
      const isAnchor = r === m.top && c === m.left;
      return !isAnchor;
    }
  }
  return false;
}

/** 读 R2 表头（第 2 行）并识别列；额外返回关键词是否**真实命中** */
export function detectColumns(ws: ExcelJS.Worksheet): {
  columns: FieldColumnMap;
  rawHeaders: string[];
  nameFound: boolean;
  feedbackFound: boolean;
} {
  const row2 = ws.getRow(2);
  const rawHeaders: string[] = [];
  const max = Math.max(row2.cellCount, 1);
  let nameFound = false;
  let feedbackFound = false;
  for (let c = 1; c <= max; c++) {
    const v = row2.getCell(c).value;
    const text = v === null || v === undefined ? "" : String(v);
    rawHeaders.push(text);
    const field = matchField(text);
    if (field === "name") nameFound = true;
    if (field === "feedback") feedbackFound = true;
  }
  return {
    columns: parseR2Headers(rawHeaders),
    rawHeaders,
    nameFound,
    feedbackFound,
  };
}

/**
 * 生成写入计划（不修改表格）
 *
 * 保守原则：任何不确定的情况都不写，并在 unmatched 里给出原因，交给人工处理。
 */
export function planSink(
  ws: ExcelJS.Worksheet,
  students: SinkStudentInput[],
  options: SinkOptions = {},
): SinkPlan {
  const { columns, nameFound } = detectColumns(ws);
  const firstDataRow = options.firstDataRow ?? 3;

  // 严格判定：parseR2Headers 在缺姓名列时会整包降级为默认列（周末解析的合理兜底），
  // 但落版器要往老师自己的表里写字，**降级默认 = 凭猜测写入**，必须拒绝。
  // 所以只有姓名列关键词真实命中才允许自动定位；反馈列缺失时仍可人工点列。
  const nameColumn = nameFound && columns.name >= 1 ? columns.name : null;
  let feedbackColumn: number | null = columns.feedback;
  let columnSource: SinkPlan["columnSource"] = feedbackColumn
    ? "header"
    : "none";
  if (options.manualFeedbackColumn && options.manualFeedbackColumn >= 1) {
    feedbackColumn = options.manualFeedbackColumn;
    columnSource = "manual";
  }

  const plan: SinkPlan = {
    sheetName: ws.name,
    columns,
    columnSource,
    feedbackColumn,
    nameColumn,
    matches: [],
    unmatched: [],
  };

  // 没有姓名列或反馈列 → 全部交人工（不猜列位置）
  if (!nameColumn || !feedbackColumn) {
    for (const s of students) {
      plan.unmatched.push({ name: s.name, reason: "no_column" });
    }
    return plan;
  }

  // 建立姓名 → 行号索引；同名多行视为不可猜
  const rowsByName = new Map<string, number[]>();
  const lastRow = ws.rowCount ?? 0;
  for (let r = firstDataRow; r <= lastRow; r++) {
    const raw = ws.getRow(r).getCell(nameColumn).value;
    const name = raw === null || raw === undefined ? "" : String(raw).trim();
    if (!name) continue;
    const list = rowsByName.get(name) ?? [];
    list.push(r);
    rowsByName.set(name, list);
  }

  for (const student of students) {
    const name = student.name.trim();
    if (!name) {
      plan.unmatched.push({ name: student.name, reason: "empty_name" });
      continue;
    }
    const rows = rowsByName.get(name);
    if (!rows || rows.length === 0) {
      plan.unmatched.push({ name, reason: "missing" });
      continue;
    }
    if (rows.length > 1) {
      plan.unmatched.push({ name, reason: "duplicate" });
      continue;
    }
    const row = rows[0];
    if (isMergedAway(ws, row, feedbackColumn)) {
      plan.unmatched.push({ name, reason: "merged" });
      continue;
    }
    plan.matches.push({
      row,
      name,
      column: feedbackColumn,
      text: student.text,
    });
  }

  return plan;
}

/**
 * 执行写入（只改值与换行/对齐；不重排列宽行高、不重建 sheet）
 *
 * @returns 实际写入的行数
 */
export function applySink(ws: ExcelJS.Worksheet, plan: SinkPlan): number {
  let written = 0;
  for (const match of plan.matches) {
    const cell = ws.getRow(match.row).getCell(match.column);
    cell.value = match.text;
    // 长反馈靠换行吸收（与既有导出器一致），不截断文本
    cell.alignment = {
      ...(cell.alignment ?? {}),
      wrapText: true,
      vertical: "middle",
      horizontal: "center",
    };
    written++;
  }
  return written;
}

/** 写回字节（浏览器下载/预览用） */
export async function workbookToBlob(wb: ExcelJS.Workbook): Promise<Blob> {
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * 班级级整段落版（课堂小结没有学生姓名，无法按行匹配）
 *
 * 写入用户指定的单元格；目标格落在非锚点合并区时拒绝（同 planSink 的保守原则）。
 */
export function applyClassText(
  ws: ExcelJS.Worksheet,
  target: { row: number; column: number; text: string },
): { ok: true } | { ok: false; reason: "merged" | "invalid" } {
  const { row, column } = target;
  if (
    !Number.isInteger(row) ||
    row < 1 ||
    !Number.isInteger(column) ||
    column < 1
  ) {
    return { ok: false, reason: "invalid" };
  }
  if (isMergedAway(ws, row, column)) {
    return { ok: false, reason: "merged" };
  }
  const cell = ws.getRow(row).getCell(column);
  cell.value = target.text;
  cell.alignment = {
    ...(cell.alignment ?? {}),
    wrapText: true,
    vertical: "middle",
    horizontal: "center",
  };
  return { ok: true };
}

/** 从 File 加载 exceljs Workbook（动态 import，重依赖不进首屏） */
export async function loadWorkbookFromFile(
  file: File,
): Promise<ExcelJS.Workbook> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  return wb;
}
