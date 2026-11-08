import type ExcelJS from "exceljs";
import {
  decodeMergeRange,
  isMergeAnchor,
  isMergedAway,
  type CellAlign,
  type CellModel,
  type MergeRange,
  type SheetGrid,
} from "./render-types";

/**
 * S04 T-401 · xlsx → 真实网格模型
 *
 * 复用已装的 exceljs（与 weekend-exporter 同一份 Workbook），把单元格值、字体、对齐、
 * 合并区域、列宽、行高抽成纯数据结构；DOM 层只负责把它画成表格。
 * 这样「预览 = 导出件」的断言可以在 vitest 里对同一份模型做，而不需要浏览器。
 */

/** exceljs 单元格值 → 展示文本（覆盖富文本/公式/超链接/日期等形态） */
export function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "object") {
    const v = value as {
      richText?: { text?: string }[];
      text?: string;
      result?: unknown;
      formula?: string;
      hyperlink?: string;
      error?: string;
    };
    if (Array.isArray(v.richText)) {
      return v.richText.map((r) => r.text ?? "").join("");
    }
    if (typeof v.text === "string") return v.text;
    if (v.result !== undefined && v.result !== null) return cellText(v.result);
    if (typeof v.error === "string") return v.error;
    if (typeof v.formula === "string") return `=${v.formula}`;
  }
  return "";
}

function normalizeAlign(horizontal: unknown): CellAlign {
  if (horizontal === "center" || horizontal === "right") return horizontal;
  return "left";
}

/** 把 exceljs Worksheet 转成纯网格模型 */
export function buildSheetGrid(ws: ExcelJS.Worksheet): SheetGrid {
  const merges: MergeRange[] = (ws.model?.merges ?? []).map(decodeMergeRange);

  const rowCount = Math.max(ws.rowCount ?? 0, 0);
  const colCount = Math.max(ws.columnCount ?? 0, 0);

  const rows: CellModel[][] = [];
  for (let r = 1; r <= rowCount; r++) {
    const row = ws.getRow(r);
    const cells: CellModel[] = [];
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      cells.push({
        text: cellText(cell.value),
        bold: Boolean(cell.font?.bold),
        italic: Boolean(cell.font?.italic),
        align: normalizeAlign(cell.alignment?.horizontal),
        wrap: Boolean(cell.alignment?.wrapText),
        fontSize:
          typeof cell.font?.size === "number"
            ? (cell.font.size as number)
            : null,
        isMergeAnchor: isMergeAnchor(merges, r - 1, c - 1),
        isMergedAway: isMergedAway(merges, r - 1, c - 1),
      });
    }
    rows.push(cells);
  }

  const colWidths: (number | null)[] = [];
  for (let c = 1; c <= colCount; c++) {
    const w = ws.getColumn(c).width;
    colWidths.push(typeof w === "number" ? w : null);
  }

  const rowHeights: (number | null)[] = [];
  for (let r = 1; r <= rowCount; r++) {
    const h = ws.getRow(r).height;
    rowHeights.push(typeof h === "number" ? h : null);
  }

  return {
    name: ws.name,
    rows,
    merges,
    colWidths,
    rowHeights,
    rowCount,
    colCount,
  };
}

/** 网格是否为空（全空白）——用于给出「非空白 fallback」而不是渲染空表 */
export function isGridEmpty(grid: SheetGrid): boolean {
  return !grid.rows.some((row) => row.some((cell) => cell.text.trim() !== ""));
}

/** 网格摘要（预览失败时的降级文案与测试断言用） */
export function summarizeGrid(grid: SheetGrid): string {
  const filled = grid.rows.reduce(
    (acc, row) => acc + row.filter((c) => c.text.trim() !== "").length,
    0,
  );
  return `${grid.name}：${grid.rowCount} 行 × ${grid.colCount} 列，${filled} 个非空单元格，${grid.merges.length} 处合并`;
}
