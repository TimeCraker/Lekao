/**
 * 周末错题反馈表 · Excel 导出器
 * 来源：docs/stages/weekend-mistake-table-v0.md Stage 2
 *
 * 跟现有 mistake/docx-generator 完全不同（docx 是单个学生一个文件）
 * 周末反馈表是 **整个 workbook 多 Sheet 写回**：
 * - 保留原 R1（标题，updatedTitle 已替换日期）
 * - 保留原 R2（列头）
 * - 学生行：A 序号 | B 姓名 | C qNumbersInput（错题或特殊值） | D feedback
 * - 多 Sheet 同时导出为 1 个 xlsx
 * - 文件名：用户改或默认生成
 *
 * 实现策略（XLSX.utils.aoa_to_sheet 重建）：
 * - 把 rawRows 复制 → 在 R3+ 行替换 C 列 + D 列
 * - updatedTitle 替换 R1 对应单元格
 * - 不依赖原 workbook 的结构（保留 rawRows 完整数组 + 在 index 2+ 操作）
 */

import * as XLSX from "xlsx";
import type {
  WeekendSheet,
  WeekendStudent,
  WeekendWorkbook,
} from "./weekend-types";

/**
 * 把 1 个 Sheet 写成 worksheet
 *
 * @param rawRows 原 sheet 的二维数组（来自 XLSX.utils.sheet_to_json）
 * @param sheet 编辑过的 sheet 数据
 * @returns XLSX.Worksheet
 */
function buildSheet(rawRows: unknown[][], sheet: WeekendSheet): XLSX.WorkSheet {
  // 复制原 rows
  const rows: unknown[][] = rawRows.map((r) => [...r]);

  // ===== R1：标题行（rows[0]）=====
  if (rows.length > 0 && sheet.updatedTitle) {
    const r1 = rows[0];
    // 找第一个非空单元格位置（标题所在位置）
    let targetCol = 0;
    for (let c = 0; c < r1.length; c++) {
      if (r1[c] && String(r1[c]).trim()) {
        targetCol = c;
        break;
      }
    }
    r1[targetCol] = sheet.updatedTitle;
  }

  // ===== R2：列头（rows[1]）保持不变 =====

  // ===== R3+：学生行（rows[2:]）=====
  // students 按 rowIndex 排序（保留原顺序）
  const studentsByRowIdx = new Map<number, WeekendStudent>();
  for (const s of sheet.students) {
    studentsByRowIdx.set(s.rowIndex, s);
  }

  // 遍历 rows[2:]，对每个有学生的行填 C/D 列 + 序号 A 列
  for (let r = 2; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;

    // 学生匹配：按 rowIndex
    const student = studentsByRowIdx.get(r);
    if (!student) continue;

    // B 列姓名验证（如果 B 列为空就不填这条）
    const nameInRow = String(row[1] ?? "").trim();
    if (!nameInRow) continue;

    // A 列：序号（用户在 UI 里可能改过 serialNumber）
    if (student.serialNumber !== undefined) {
      row[0] = student.serialNumber;
    }

    // C 列：错题（C 列原内容被覆盖）
    row[2] = student.qNumbersInput ?? "";

    // D 列：反馈
    row[3] = student.feedback ?? "";
  }

  return XLSX.utils.aoa_to_sheet(rows);
}

/**
 * 生成导出 workbook 供下载或下载
 */
export function buildExportWorkbook(workbook: WeekendWorkbook): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  for (const sheet of workbook.sheets) {
    const ws = buildSheet(sheet.rawRows, sheet);
    XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName);
  }

  return wb;
}

/**
 * 导出整个工作簿 → 浏览器下载（默认路径）
 *
 * @param workbook 编辑过的 workbook
 * @param fileName 下载的文件名（如 "2026超火1班数学6.26【反馈表】.xlsx"）
 */
export function exportWeekendWorkbook(
  workbook: WeekendWorkbook,
  fileName: string,
): void {
  const wb = buildExportWorkbook(workbook);

  // SheetJS 自带 writeFile 会触发浏览器下载
  // 第二个参数是文件名，第三个是配置
  XLSX.writeFile(wb, fileName, {
    bookType: "xlsx",
    compression: true,
  });
}

/**
 * 生成默认文件名（用户可改）
 *
 * 规则：
 * - 从 firstSheet.updatedTitle 提取班级+学科（去掉日期+前缀）
 * - 简化：用 sheetName 作为核心（"超火1班数学"）+ 今日日期
 * - 示例："2026超火1班数学6.26【反馈表】.xlsx"
 *
 * @param sheetName 第一个 sheet 的 sheetName
 * @param date ISO 日期 "2026-06-26"
 * @returns 建议文件名
 */
export function suggestExportFileName(sheetName: string, date: string): string {
  // date 格式：YYYY-MM-DD
  const [, m, d] = date.split("-");
  const md = `${parseInt(m, 10)}.${parseInt(d, 10)}`;
  return `${sheetName}${md}【反馈表】.xlsx`;
}