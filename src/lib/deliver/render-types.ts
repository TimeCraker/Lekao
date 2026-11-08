/**
 * S04 T-401 · 交付渲染引擎共享类型
 *
 * 设计约定：渲染分两层
 * 1. 纯逻辑层（本目录 lib 函数）：把产物字节/模型转成可断言的中间结构，可在 vitest 里覆盖
 * 2. DOM 层（src/components/deliver/**）：只负责把中间结构挂到真实 DOM，走真实页面走查
 */

export type CellAlign = "left" | "center" | "right";

export interface CellModel {
  text: string;
  bold: boolean;
  italic: boolean;
  align: CellAlign;
  wrap: boolean;
  fontSize: number | null;
  /** 该单元格是否为合并区域的左上角（非左上角的格子不重复渲染） */
  isMergeAnchor: boolean;
  /** 被合并覆盖但非锚点的格子 */
  isMergedAway: boolean;
}

export interface MergeRange {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

export interface SheetGrid {
  name: string;
  rows: CellModel[][];
  merges: MergeRange[];
  /** 列宽（字符单位，undefined 用默认值） */
  colWidths: (number | null)[];
  /** 行高（点，undefined 用默认值） */
  rowHeights: (number | null)[];
  rowCount: number;
  colCount: number;
}

/** A1 引用 ↔ 0 基下标 */
export function decodeCellRef(ref: string): { row: number; col: number } {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  if (!m) throw new Error(`非法单元格引用: ${ref}`);
  const [, letters, digits] = m;
  let col = 0;
  for (const ch of letters) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { row: Number(digits) - 1, col: col - 1 };
}

/** "A1:C3" → 0 基 MergeRange */
export function decodeMergeRange(range: string): MergeRange {
  const [start, end = start] = range.split(":");
  const s = decodeCellRef(start);
  const e = decodeCellRef(end);
  return {
    top: Math.min(s.row, e.row),
    left: Math.min(s.col, e.col),
    bottom: Math.max(s.row, e.row),
    right: Math.max(s.col, e.col),
  };
}

/** 是否是合并区域的锚点（左上角） */
export function isMergeAnchor(
  merges: MergeRange[],
  row: number,
  col: number,
): boolean {
  return merges.some((m) => m.top === row && m.left === col);
}

/** 是否被某个合并区域覆盖（且非锚点） */
export function isMergedAway(
  merges: MergeRange[],
  row: number,
  col: number,
): boolean {
  return merges.some(
    (m) =>
      row >= m.top &&
      row <= m.bottom &&
      col >= m.left &&
      col <= m.right &&
      !(row === m.top && col === m.left),
  );
}
