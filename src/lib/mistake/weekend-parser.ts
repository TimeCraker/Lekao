/**
 * 周末错题反馈表 · Excel 解析器
 * 来源：docs/stages/weekend-mistake-table-v0.md Stage 1
 *
 * 跟现有 excel-parser.ts 的差异：
 * - 现有是"姓名 + 堂测 + 作业 3 列"格式 + 自动识别列
 * - 周末是"序号 + 姓名 + 错题（C·空·用户手动填）+ 反馈（D·空）"固定 4 列结构
 * - 周末要识别 R1 表头日期 + 替换成本周日期
 * - 周末多 Sheet，导出时合并保留
 *
 * R1 日期格式（实测 · 模板观察）：
 * - "2026超火1班数学反馈表 6月14日"    ← 中文月份
 * - "高一超火1班物理课堂反馈表 6.14"   ← 点号
 * - "高一超火1班化学课堂反馈表 6.14"   ← 点号
 */

import * as XLSX from "xlsx";
import type {
  WeekendSheet,
  WeekendStudent,
  WeekendWorkbook,
  FieldColumnMap,
} from "./weekend-types";
import {
  parseR2Headers,
  DEFAULT_FIELD_COLUMNS,
  readCell,
} from "./weekend-headers";

// ============== 日期工具 ==============

/** 返回今天的 ISO 日期 (YYYY-MM-DD) · 用户 2026-06-26 决策 "默认填今天" */
export function getThisWeekendDate(): string {
  return formatISO(new Date());
}

function formatISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type DateFormat = "chinese" | "dot" | "iso";

/** 检测字符串里的日期格式 */
function detectDateFormat(text: string): DateFormat | null {
  if (/\d+月\d+日?/.test(text)) return "chinese";
  if (/\d{4}-\d{2}-\d{2}/.test(text)) return "iso";
  if (/\d{1,2}\.\d{1,2}/.test(text)) return "dot";
  return null;
}

/** 把 ISO 日期按指定格式输出 */
function formatDateByFormat(iso: string, fmt: DateFormat): string {
  const [, m, d] = iso.split("-");
  const mm = parseInt(m, 10);
  const dd = parseInt(d, 10);
  if (fmt === "chinese") return `${mm}月${dd}日`;
  if (fmt === "dot") return `${mm}.${dd}`;
  return iso;
}

/** 从 R1 文本里提取日期 + ISO 化（用于 updatedTitle） */
function extractDateFromTitle(
  title: string,
): { iso: string; format: DateFormat } | null {
  // 中文："X月Y日" 或 "X月Y"
  const cnMatch = title.match(/(\d{1,2})月(\d{1,2})日?/);
  if (cnMatch) {
    const now = new Date().getFullYear();
    const iso = `${now}-${pad2(cnMatch[1])}-${pad2(cnMatch[2])}`;
    return { iso, format: "chinese" };
  }

  // ISO：YYYY-MM-DD
  const isoMatch = title.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return { iso: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`, format: "iso" };
  }

  // 点号：M.D 或 MM.DD
  const dotMatch = title.match(/(\d{1,2})\.(\d{1,2})/);
  if (dotMatch) {
    const now = new Date().getFullYear();
    const iso = `${now}-${pad2(dotMatch[1])}-${pad2(dotMatch[2])}`;
    return { iso, format: "dot" };
  }

  return null;
}

function pad2(n: string): string {
  return n.padStart(2, "0");
}

/** 把标题里的日期替换成本周日期（保留原格式） */
function replaceTitleDate(
  title: string,
  newIso: string,
  format: DateFormat,
): string {
  const newStr = formatDateByFormat(newIso, format);
  if (format === "chinese") {
    return title.replace(/\d{1,2}月\d{1,2}日?/, newStr);
  }
  if (format === "iso") {
    return title.replace(/\d{4}-\d{2}-\d{2}/, newStr);
  }
  return title.replace(/\d{1,2}\.\d{1,2}/, newStr);
}

// ============== Hash 文件内容（用于草稿 key） ==============

/** 简单 hash（不加密，用于 localStorage 区分不同文件） */
export async function hashFileContent(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let hash = 5381;
  // 简单 djb2，截取前 64KB 算 hash（避免大文件卡顿）
  const len = Math.min(bytes.length, 65536);
  for (let i = 0; i < len; i++) {
    hash = ((hash << 5) + hash + bytes[i]) | 0;
  }
  return `w${(hash >>> 0).toString(36)}-${bytes.length}`;
}

// ============== Sheet 解析 ==============

/**
 * 解析单个 Sheet：
 * - R1 (row 0)：找非空单元格 → 标题（含日期）
 * - R2 (row 1)：列头（验证 "序号 | 姓名 | ... | 反馈" 结构）
 * - R3+ (row 2+)：学生数据
 *
 * 关键：周末表格 C/D 列默认空（用户手动填），不读 Excel 已有错题号
 * （用户 2026-06-26 决策：周末拿到的表 C 列是空的）
 *
 * ⭐ Stage 6 (用户 2026-06-27 反馈重构)：
 * - 不再硬编码 B=姓名/C=错题/D=反馈
 * - 用 R2 表头字符串动态识别字段列号（见 weekend-headers.ts）
 * - 读 R3+ 原始内容（C/D/E 列）作为初始值，不丢用户已填内容
 */
function parseWeekendSheet(
  workbook: XLSX.WorkBook,
  sheetName: string,
  newDate: string,
): WeekendSheet {
  const ws = workbook.Sheets[sheetName];
  if (!ws) {
    throw new Error(`Sheet "${sheetName}" 不存在`);
  }

  // SheetJS 的 !ref 包含实际范围
  const ref = ws["!ref"];
  if (!ref) {
    return {
      sheetName,
      originalTitle: "",
      updatedTitle: "",
      classroomHint: sheetName,
      detectedDate: null,
      newDate,
      students: [],
      rawRows: [],
      cols: 4,
      fieldColumns: { ...DEFAULT_FIELD_COLUMNS },
    };
  }

  const range = XLSX.utils.decode_range(ref);
  const maxRow = range.e.r + 1;
  const maxCol = range.e.c + 1;

  // 读成二维数组
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: false,
  });

  // ===== R1：标题行 =====
  let originalTitle = "";
  if (rows.length > 0) {
    const r1 = rows[0] as unknown[];
    // 找第一个非空 cell（B 列最常见，但 A 列偶尔也有内容如 "6月14日"）
    for (const cell of r1) {
      if (cell && String(cell).trim()) {
        originalTitle = String(cell).trim();
        break;
      }
    }
  }

  let detectedDate: string | null = null;
  let updatedTitle = originalTitle;
  if (originalTitle) {
    const parsed = extractDateFromTitle(originalTitle);
    if (parsed) {
      detectedDate = parsed.iso;
      updatedTitle = replaceTitleDate(originalTitle, newDate, parsed.format);
    }
  }

  // ===== R2：列头识别（⭐ Stage 6）=====
  const fieldColumns: FieldColumnMap =
    rows.length > 1
      ? parseR2Headers(rows[1] as unknown[])
      : { ...DEFAULT_FIELD_COLUMNS };

  // ===== R3+：学生数据（按 fieldColumns 读）=====
  const students: WeekendStudent[] = [];
  // 跳过 R1 (rows[0]) + R2 (rows[1] 列头)
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row || row.length === 0) continue;

    // 姓名列（按 fieldColumns.name 定位）
    const name = readCell(row, fieldColumns.name);
    if (!name) continue;

    // 序号列（可选）
    const serialNumber = readCell(row, fieldColumns.serial);

    // 错题列（按 fieldColumns.qNumbersCols 定位，可能有 1-2 列）
    const qNumbersInput = readCell(row, fieldColumns.qNumbersCols[0] ?? null);
    const qNumbersInput2 =
      fieldColumns.qNumbersCols.length >= 2
        ? readCell(row, fieldColumns.qNumbersCols[1])
        : undefined;

    // 反馈列（按 fieldColumns.feedback 定位）
    const feedback = readCell(row, fieldColumns.feedback);

    students.push({
      rowIndex: i,
      serialNumber,
      name,
      qNumbersInput,
      qNumbersInput2,
      feedback,
    });
  }

  return {
    sheetName,
    originalTitle,
    updatedTitle,
    classroomHint: sheetName,
    detectedDate,
    newDate,
    students,
    rawRows: rows,
    cols: Math.max(maxCol, 4),
    fieldColumns,
  };
}

// ============== 顶层 API ==============

/** 解析整个工作簿（多 Sheet） */
export function parseWeekendWorkbook(
  workbook: XLSX.WorkBook,
  fileName: string,
  fileHash: string,
): WeekendWorkbook {
  const newDate = getThisWeekendDate();
  const sheets: WeekendSheet[] = [];

  for (const sheetName of workbook.SheetNames) {
    // 跳过空 Sheet
    const ws = workbook.Sheets[sheetName];
    if (!ws || !ws["!ref"]) continue;
    sheets.push(parseWeekendSheet(workbook, sheetName, newDate));
  }

  return {
    fileName,
    fileHash,
    sheets,
  };
}

// ============== 文件读取 ==============

/** 从 File 读取工作簿（浏览器端） */
export async function readWeekendWorkbook(file: File): Promise<{
  workbook: XLSX.WorkBook;
  fileHash: string;
}> {
  const fileHash = await hashFileContent(file);
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: "array", cellDates: false });
  return { workbook, fileHash };
}