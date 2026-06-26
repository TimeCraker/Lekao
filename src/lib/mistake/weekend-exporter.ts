/**
 * 周末错题反馈表 · Excel 导出器（v0.2.2 · 保留模板样式）
 * 来源：docs/stages/weekend-mistake-table-v0.md Stage 2 + 用户 2026-06-26 反馈
 *
 * 关键设计：**modify-in-place**（不是 aoa_to_sheet 重写）
 *
 * 用户模板实测（2026超火1班数学6.21【反馈表】.xlsx）：
 * - !cols: A=6.2, B=11.6, C=16.7, D=70.2（特定列宽）
 * - !merges: B1:D1（标题合并） + D18:D38（特殊情况区域 20 行合并）
 * - 表头 R2: patternType=solid + fgColor=9BC2E6（浅蓝）
 * - B 列名: patternType=solid + fgColor=BDD7EE（更浅蓝）
 *
 * ❌ v0.2.1 错误做法：XLSX.utils.aoa_to_sheet(rawRows) → 完全丢失 styles
 * ❌ v0.2.2 尝试用 SheetJS xlsx + setCellValue → 仍然丢失 cell.s 样式
 *    （SheetJS 社区版 writeFile 不支持 cell styles，只有 sheetjs-style fork 支持）
 * ✅ v0.2.3 正确做法：换用 **exceljs**（已装 · 4.4.0）+ 修改单元格 value
 *    exceljs 完全保留 styles/cols/merges/conditional formatting
 *
 * 关键 API：
 * - wb.xlsx.load(arrayBuffer) → 从内存加载（浏览器）
 * - ws.getCell("A1").value = "..." → 修改值（保留 style + format + border）
 * - wb.xlsx.writeBuffer() → 输出 ArrayBuffer
 * - saveAs(new Blob([buffer]), filename) → 浏览器下载
 */

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { WeekendSheet, WeekendStudent } from "./weekend-types";

/**
 * 修改单个 Sheet 的指定单元格（保留原样式）
 */
function setCellText(
  ws: ExcelJS.Worksheet,
  ref: string,
  value: string | undefined,
): void {
  if (value === undefined || value === null) return;
  ws.getCell(ref).value = value;
}

/**
 * 更新单个 Sheet：
 * 1. R1 标题 → updatedTitle（替换第一个非空 cell）
 * 2. R3+ 学生行 → A 序号 / C 错题 / D 反馈（B 姓名原值保留不动）
 */
function updateSheetInPlace(
  ws: ExcelJS.Worksheet,
  sheet: WeekendSheet,
): void {
  // ===== R1：标题行（row 1）=====
  // 找第一个非空单元格位置（实测在 B1，不是 A1）
  let titleCol = -1;
  const row1 = ws.getRow(1);
  for (let c = 1; c <= row1.cellCount; c++) {
    const cell = row1.getCell(c);
    if (cell.value !== null && cell.value !== undefined && String(cell.value).trim()) {
      titleCol = c;
      break;
    }
  }
  if (titleCol >= 1 && sheet.updatedTitle) {
    setCellText(ws, `${colLetter(titleCol)}1`, sheet.updatedTitle);
  }

  // ===== R3+：学生行（row 3+）=====
  // 学生按 rowIndex 索引（rowIndex = 在 rawRows 数组中的索引，对应 Excel row 3+）
  const studentsByRowIdx = new Map<number, WeekendStudent>();
  for (const s of sheet.students) {
    studentsByRowIdx.set(s.rowIndex, s);
  }

  // Excel row N = rawRows index N-1；students.rowIndex 是 rawRows 数组 index
  // 所以 Excel row = students.rowIndex + 1
  for (const student of sheet.students) {
    const excelRow = student.rowIndex + 1;
    if (excelRow < 3) continue; // 跳过标题/列头

    // A 列：序号
    if (student.serialNumber !== undefined) {
      setCellText(ws, `A${excelRow}`, student.serialNumber);
    }

    // C 列：错题（覆盖原 C 列内容）
    if (student.qNumbersInput !== undefined) {
      setCellText(ws, `C${excelRow}`, student.qNumbersInput);
    }

    // D 列：反馈
    if (student.feedback !== undefined) {
      setCellText(ws, `D${excelRow}`, student.feedback);
    }
  }
}

/** Excel 列号转字母（1=A, 2=B, ...）*/
function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * 浏览器端：从用户上传的 File 重新加载为 exceljs Workbook
 *
 * 注意：不能用 parseWeekendWorkbook 时的 wb（那是 xlsx 的）
 * 需要从原始 ArrayBuffer 用 exceljs 重新加载，保留所有样式
 */
export async function loadWeekendWorkbookForExport(file: File): Promise<ExcelJS.Workbook> {
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  return wb;
}

/**
 * 修改原 workbook 原地（保留所有样式 + 列宽 + 合并 + 表头色 + 字体）
 *
 * @param wb 原 workbook（来自 loadWeekendWorkbookForExport）
 * @param sheets 编辑过的 sheets
 * @returns 修改后的 workbook（同引用）
 */
export function buildExportWorkbook(
  wb: ExcelJS.Workbook,
  sheets: WeekendSheet[],
): ExcelJS.Workbook {
  for (const sheet of sheets) {
    const ws = wb.getWorksheet(sheet.sheetName);
    if (!ws) {
      console.warn(`Sheet "${sheet.sheetName}" 在原 workbook 中不存在，跳过`);
      continue;
    }
    updateSheetInPlace(ws, sheet);
  }
  return wb;
}

/**
 * 触发浏览器下载（保留原模板样式）
 *
 * 浏览器场景下用 writeBuffer + file-saver 的 Blob 方案
 */
export async function exportWeekendWorkbook(
  wb: ExcelJS.Workbook,
  sheets: WeekendSheet[],
  fileName: string,
): Promise<void> {
  const finalWb = buildExportWorkbook(wb, sheets);
  const buffer = await finalWb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, fileName);
}

/**
 * 生成默认文件名
 */
export function suggestExportFileName(sheetName: string, date: string): string {
  const [, m, d] = date.split("-");
  const md = `${parseInt(m, 10)}.${parseInt(d, 10)}`;
  return `${sheetName}${md}【反馈表】.xlsx`;
}