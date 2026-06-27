/**
 * 周末错题反馈表 · Excel 导出器（v0.3 · 保留模板样式 + 排序顺序）
 * 来源：docs/stages/weekend-mistake-table-v0.md Stage 2 + 用户 2026-06-27 反馈
 *
 * 关键设计：**modify-in-place**（不是 aoa_to_sheet 重写）
 *
 * ⭐ v0.3 关键修复（用户 2026-06-27 反馈）：
 * - 之前按 student.rowIndex 写入 Excel 行号 → 浏览器排序后导出仍按原行号（错）
 * - 现在按 students 数组当前顺序从 row 3 开始连续写入 → 排序生效
 * - 同时清空原 rowIndex 位置残留值 + 补全框线
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
import type {
  WeekendSheet,
  WeekendStudent,
  FieldColumnMap,
} from "./weekend-types";

/**
 * 设置单元格文本（保留原样式）
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
 * ⭐ Stage 9.2：解开 worksheet 的非 R1 合并（防止老模板上传后写入失败）
 *
 * 用户 2026-06-27 反馈：模板的"特殊情况区域"合并（D19:D38）导致 AI 反馈填不进去。
 * 解决方案：
 * 1. 模板侧：strip-template-merges.cjs 已处理 public/templates/
 * 2. 用户上传老模板时：export 前动态解开所有非 R1 合并（不影响样式，只解 merge）
 *
 * 注意：只解 R2+ 的合并（R1 标题合并保留）
 */
function stripNonTitleMerges(ws: ExcelJS.Worksheet): number {
  const merges = (ws.model && (ws.model as { merges?: string[] }).merges) || [];
  let removed = 0;
  const toRemove: string[] = [];
  for (const m of merges) {
    const start = m.match(/^[A-Z]+(\d+):/);
    if (!start) {
      toRemove.push(m);
      continue;
    }
    const startRow = parseInt(start[1], 10);
    if (startRow !== 1) toRemove.push(m);
  }
  for (const m of toRemove) {
    try {
      ws.unMergeCells(m);
      removed++;
    } catch (e) {
      console.warn(`[weekend-exporter] 无法解开 merge ${m}:`, e);
    }
  }
  if (removed > 0) {
    console.log(`[weekend-exporter] Sheet "${ws.name}": 解开 ${removed} 个非标题合并`);
  }
  return removed;
}

/**
 * 清空单元格 value（不删样式，仅清空内容）
 */
function clearCellText(ws: ExcelJS.Worksheet, ref: string): void {
  const cell = ws.getCell(ref);
  cell.value = null;
}

/**
 * ⭐ v0.3：给单元格补 thin 框线（不覆盖已有 style，只补 border）
 */
function ensureThinBorder(ws: ExcelJS.Worksheet, ref: string): void {
  const cell = ws.getCell(ref);
  const existing = cell.style || {};
  const border = existing.border || {};
  const thin: Partial<ExcelJS.Border> = { style: "thin" };
  cell.style = {
    ...existing,
    border: {
      top: border.top ?? thin,
      left: border.left ?? thin,
      bottom: border.bottom ?? thin,
      right: border.right ?? thin,
    },
  };
}

/**
 * ⭐ Stage 7.4：给所有数据单元格补统一的 alignment（水平居中 + 垂直居中 + 自动换行）
 *
 * 用户反馈：手动新增的学生行字体大小/对齐/换行和 Excel 原行不一致
 * 原因：原 R3-R42 单元格继承模板样式（已设好），但 R43+ 写入时是空白 cell → 无 alignment
 * 解法：writeStudentRow 时显式设置 alignment + wrapText
 */
function ensureCellAlignment(
  ws: ExcelJS.Worksheet,
  ref: string,
  options: { wrapText?: boolean; horizontal?: ExcelJS.Alignment["horizontal"] } = {},
): void {
  const cell = ws.getCell(ref);
  const existing = cell.style || {};
  const existingAlign = existing.alignment || {};
  cell.style = {
    ...existing,
    alignment: {
      ...existingAlign,
      vertical: existingAlign.vertical ?? "middle",
      horizontal: options.horizontal ?? existingAlign.horizontal ?? "center",
      wrapText: options.wrapText ?? existingAlign.wrapText ?? true,
    },
  };
}

/**
 * ⭐ Stage 7.4：按数据列内容计算合适的列宽（feedback 列按最长内容撑开）
 *
 * Excel 列宽单位是字符宽度（中文字符约 2 个单位）
 * - 反馈列：取所有学生反馈的最大长度 → 25~60 之间
 * - 错题列：固定 18（题号不超 6 字）
 * - 姓名列：固定 14
 * - 序号列：固定 6
 */
function autoAdjustColumnWidths(
  ws: ExcelJS.Worksheet,
  sheet: WeekendSheet,
): void {
  const fc = sheet.fieldColumns;
  const cols = ws.columns;
  if (!cols || cols.length === 0) return;

  // 收集所有学生反馈长度
  const allFeedbacks = sheet.students.map((s) => s.feedback || "");
  const maxFeedbackLen = allFeedbacks.reduce(
    (max, f) => Math.max(max, [...f].length),
    0,
  );
  // 反馈列宽：25~60 字符（clamp 避免太窄或太宽）
  const feedbackColWidth = Math.min(60, Math.max(25, maxFeedbackLen + 4));

  // 设置各列宽度（1-based col index）
  if (fc.serial !== null && cols[fc.serial - 1]) {
    cols[fc.serial - 1].width = 6;
  }
  if (cols[fc.name - 1]) {
    cols[fc.name - 1].width = 14;
  }
  for (let i = 0; i < fc.qNumbersCols.length; i++) {
    const c = fc.qNumbersCols[i];
    if (cols[c - 1]) {
      cols[c - 1].width = 18;
    }
  }
  if (fc.feedback !== null && cols[fc.feedback - 1]) {
    cols[fc.feedback - 1].width = feedbackColWidth;
  }
}

/**
 * ⭐ Stage 6：把所有数据列的列号收集出来（清空/写入/边框都用）
 */
function getDataCols(fc: FieldColumnMap): number[] {
  const cols: number[] = [];
  if (fc.serial !== null) cols.push(fc.serial);
  cols.push(fc.name);
  cols.push(...fc.qNumbersCols);
  if (fc.feedback !== null) cols.push(fc.feedback);
  return cols;
}

/**
 * ⭐ Stage 6：把指定行的所有数据列清空（不再硬编码 A/C/D/E）
 */
function clearStudentRow(
  ws: ExcelJS.Worksheet,
  excelRow: number,
  fc: FieldColumnMap,
): void {
  if (excelRow < 3) return;
  for (const col of getDataCols(fc)) {
    clearCellText(ws, `${colLetter(col)}${excelRow}`);
  }
}

/**
 * ⭐ Stage 6：把学生数据写入指定 Excel 行（按 fieldColumns 定位）
 */
function writeStudentRow(
  ws: ExcelJS.Worksheet,
  excelRow: number,
  student: WeekendStudent,
  fc: FieldColumnMap,
): void {
  // 序号列
  if (fc.serial !== null) {
    setCellText(
      ws,
      `${colLetter(fc.serial)}${excelRow}`,
      student.serialNumber || undefined,
    );
    ensureCellAlignment(ws, `${colLetter(fc.serial)}${excelRow}`);
  }
  // 姓名列
  setCellText(ws, `${colLetter(fc.name)}${excelRow}`, student.name);
  ensureCellAlignment(ws, `${colLetter(fc.name)}${excelRow}`);
  // 错题列（1-N）
  if (fc.qNumbersCols[0] !== undefined) {
    setCellText(
      ws,
      `${colLetter(fc.qNumbersCols[0])}${excelRow}`,
      student.qNumbersInput,
    );
    ensureCellAlignment(ws, `${colLetter(fc.qNumbersCols[0])}${excelRow}`);
  }
  if (fc.qNumbersCols[1] !== undefined) {
    setCellText(
      ws,
      `${colLetter(fc.qNumbersCols[1])}${excelRow}`,
      student.qNumbersInput2 ?? "",
    );
    ensureCellAlignment(ws, `${colLetter(fc.qNumbersCols[1])}${excelRow}`);
  }
  // 反馈列（⭐ Stage 7.4：wrapText=true 让长反馈自动换行）
  if (fc.feedback !== null) {
    setCellText(
      ws,
      `${colLetter(fc.feedback)}${excelRow}`,
      student.feedback,
    );
    ensureCellAlignment(ws, `${colLetter(fc.feedback)}${excelRow}`, {
      wrapText: true,
      horizontal: "left", // 反馈列左对齐（中文阅读体验更好）
    });
  }
  // ⭐ v0.3：给所有数据列补 thin 框线
  for (const col of getDataCols(fc)) {
    ensureThinBorder(ws, `${colLetter(col)}${excelRow}`);
  }
}

/**
 * ⭐ v0.3：更新单个 Sheet（按 students 当前顺序写入 R3+）
 *
 * 关键变化（相对 v0.2.x）：
 * - 之前按 student.rowIndex 写入 → 排序后导出仍按原 rowIndex（错）
 * - 现在按 students 数组顺序从 R3 连续写入 → 排序生效
 * - 原 rowIndex 位置若被空出 → 清空残留值
 * - 每行补 thin 框线（兼容老模板部分单元格无框线）
 */
function updateSheetInPlace(
  ws: ExcelJS.Worksheet,
  sheet: WeekendSheet,
): void {
  // ⭐ Stage 9.2：解开非标题合并（防老模板上传后写入失败）
  stripNonTitleMerges(ws);

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

  // ===== R3+：学生行（按 students 数组当前顺序连续写入）=====
  const students = sheet.students;
  if (students.length === 0) return;

  // 1. 先清空原 rowIndex 位置残留（按 fieldColumns）—— 避免旧数据"原位残留"
  //    注：如果原 rowIndex = 3 (R3)，但新顺序写到 R5，清 R3 留空
  const newExcelRows = new Set<number>();
  for (let i = 0; i < students.length; i++) {
    newExcelRows.add(i + 3); // R3 起
  }
  for (const s of students) {
    const origRow = s.rowIndex + 1;
    if (origRow >= 3 && !newExcelRows.has(origRow)) {
      // 原 rowIndex 位置不会复用 → 清空
      clearStudentRow(ws, origRow, sheet.fieldColumns);
    }
  }

  // 2. 按当前数组顺序写入 R3+
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const excelRow = i + 3; // R3 起
    writeStudentRow(ws, excelRow, student, sheet.fieldColumns);
  }

  // ⭐ Stage 7.4：按内容长度自适应列宽（特别是反馈列）
  autoAdjustColumnWidths(ws, sheet);
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
 * ⭐ Stage 5.2：从 sourceSheet 复制样式创建新 worksheet
 *
 * ExcelJS 的 Worksheet 没有官方 clone API，只能手工复制：
 * - 列宽（!cols）
 * - 合并（!merges）
 * - R1 标题 + R2 表头 的 cell 样式（含字体/填充/边框）
 *
 * 不复制 R3+（学生数据由 updateSheetInPlace 后续写入）
 */
function cloneWorksheetFromSource(
  wb: ExcelJS.Workbook,
  sourceWs: ExcelJS.Worksheet,
  newName: string,
): ExcelJS.Worksheet {
  const newWs = wb.addWorksheet(newName);

  // 1. 复制列宽
  if (sourceWs.columns) {
    newWs.columns = sourceWs.columns.map((c) => ({
      ...(c.width !== undefined ? { width: c.width } : {}),
      ...(c.hidden !== undefined ? { hidden: c.hidden } : {}),
    }));
  }

  // 2. 复制合并（merges 在 exceljs 里是 string[] A1:B1 形式）
  const srcMerges: unknown = sourceWs.model && (sourceWs.model as { merges?: unknown }).merges;
  if (Array.isArray(srcMerges)) {
    (newWs.model as { merges: string[] }).merges = (srcMerges as string[]).slice();
  }

  // 3. 复制 R1 + R2 的 cell style（不复制 value，由 updateSheetInPlace 后续写入）
  for (const rowNum of [1, 2]) {
    const srcRow = sourceWs.getRow(rowNum);
    const dstRow = newWs.getRow(rowNum);
    // 行高
    if (srcRow.height !== undefined) dstRow.height = srcRow.height;
    for (let c = 1; c <= srcRow.cellCount; c++) {
      const srcCell = srcRow.getCell(c);
      const dstCell = dstRow.getCell(c);
      if (srcCell.style) {
        dstCell.style = JSON.parse(JSON.stringify(srcCell.style));
      }
      if (srcCell.numFmt) dstCell.numFmt = srcCell.numFmt;
      if (srcCell.font) dstCell.font = JSON.parse(JSON.stringify(srcCell.font));
      if (srcCell.alignment) dstCell.alignment = JSON.parse(JSON.stringify(srcCell.alignment));
      if (srcCell.border) dstCell.border = JSON.parse(JSON.stringify(srcCell.border));
      if (srcCell.fill) dstCell.fill = JSON.parse(JSON.stringify(srcCell.fill));
    }
  }

  return newWs;
}

/**
 * 修改原 workbook 原地（保留所有样式 + 列宽 + 合并 + 表头色 + 字体）
 *
 * ⭐ Stage 5.2：处理"新加 sheet"——isNewSheet=true 时先从 sourceSheet 复制样式创建新 worksheet
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
    let ws = wb.getWorksheet(sheet.sheetName);

    if (!ws) {
      // 找不到：可能是新加的 sheet
      if (sheet.isNewSheet && sheet.sourceSheetName) {
        const srcWs = wb.getWorksheet(sheet.sourceSheetName);
        if (srcWs) {
          console.log(`[weekend-exporter] 新 sheet「${sheet.sheetName}」从「${sheet.sourceSheetName}」clone 样式`);
          ws = cloneWorksheetFromSource(wb, srcWs, sheet.sheetName);
        } else {
          console.warn(`Sheet "${sheet.sheetName}" + source "${sheet.sourceSheetName}" 都不存在，跳过`);
          continue;
        }
      } else {
        console.warn(`Sheet "${sheet.sheetName}" 在原 workbook 中不存在，跳过`);
        continue;
      }
    }

    updateSheetInPlace(ws, sheet);
  }
  return wb;
}

/**
 * 触发浏览器下载（保留原模板样式）
 *
 * 浏览器场景下用 writeBuffer + file-saver 的 Blob 方案
 *
 * v0.2.4 修复：exceljs 写 conditionalFormatting 时会生成非法 XML
 *   → 用户打开时 Excel 报 "文件级验证和修复 · /xl/worksheets/sheetN.xml"
 *   → 解法：写完后用 JSZip 后处理 zip 包，删除所有 <conditionalFormatting> 块
 *   → 用户没用到这些规则（"停"/"假"等标记），删掉对视觉无影响
 *
 * 参考：https://github.com/exceljs/exceljs/issues/106
 */
export async function exportWeekendWorkbook(
  wb: ExcelJS.Workbook,
  sheets: WeekendSheet[],
  fileName: string,
): Promise<void> {
  const finalWb = buildExportWorkbook(wb, sheets);
  let buffer = await finalWb.xlsx.writeBuffer();

  // v0.2.4: 后处理 strip conditional formatting（exceljs 写坏的根源）
  try {
    buffer = await stripConditionalFormatting(buffer);
  } catch (e) {
    console.warn("[weekend-exporter] 后处理 conditional formatting 失败，继续输出原文件:", e);
  }

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, fileName);
}

/**
 * 用 JSZip 打开 xlsx buffer，删除所有 sheet xml 中的 <conditionalFormatting> 块，
 * 然后重新打包回 buffer。
 *
 * 使用动态 import 避免 SSR 报错（jszip 不在 server bundle）。
 */
async function stripConditionalFormatting(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  if (typeof window === "undefined") return buffer; // SSR 跳过
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);

  const sheetFiles = Object.keys(zip.files).filter(
    (name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name),
  );

  for (const sheetName of sheetFiles) {
    const file = zip.file(sheetName);
    if (!file) continue;
    const xml = await file.async("string");

    // 匹配 <conditionalFormatting ...>...</conditionalFormatting>（包括自闭合 <.../>）
    // 用非贪婪 + 多行匹配；保留 cfRule 不被切碎
    const cleaned = xml.replace(
      /<conditionalFormatting\b[^>]*>[\s\S]*?<\/conditionalFormatting>|<conditionalFormatting\b[^>]*\/>/g,
      "",
    );

    if (cleaned !== xml) {
      zip.file(sheetName, cleaned);
    }
  }

  return await zip.generateAsync({
    type: "arraybuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

/**
 * 生成默认文件名
 */
export function suggestExportFileName(sheetName: string, date: string): string {
  const [, m, d] = date.split("-");
  const md = `${parseInt(m, 10)}.${parseInt(d, 10)}`;
  return `${sheetName}${md}【反馈表】.xlsx`;
}