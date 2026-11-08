import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  buildSheetGrid,
  cellText,
  isGridEmpty,
  summarizeGrid,
} from "./xlsx-render";
import { decodeCellRef, decodeMergeRange } from "./render-types";

/**
 * S04 T-401 · xlsx 网格渲染纯逻辑
 *
 * 用真实 exceljs Workbook 构造，断言预览网格与导出件读的是同一份模型：
 * 合并区域、字体、对齐、列宽、行高、单元格值形态（富文本/公式）。
 */
function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("数学");
  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 40;

  ws.getCell("A1").value = "2026超火1班数学【反馈表】";
  ws.mergeCells("A1:C1");
  ws.getCell("A1").alignment = { horizontal: "center", wrapText: true };
  ws.getCell("A1").font = { bold: true, size: 16 };

  ws.getCell("A2").value = "序号";
  ws.getCell("B2").value = "姓名";
  ws.getCell("C2").value = "反馈";
  ws.getCell("B2").font = { bold: true };

  ws.getCell("A3").value = 1;
  ws.getCell("B3").value = "张三";
  ws.getCell("C3").value = {
    richText: [{ text: "第 3 题" }, { text: "计算有误" }],
  };
  ws.getCell("C3").alignment = { horizontal: "left", wrapText: true };
  ws.getRow(3).height = 60;

  ws.getCell("B4").value = { formula: "SUM(A3:A3)", result: 1 };

  return wb;
}

describe("decodeCellRef / decodeMergeRange", () => {
  it("A1 → {0,0}，C3 → {2,2}，AA10 → {9,26}", () => {
    expect(decodeCellRef("A1")).toEqual({ row: 0, col: 0 });
    expect(decodeCellRef("C3")).toEqual({ row: 2, col: 2 });
    expect(decodeCellRef("AA10")).toEqual({ row: 9, col: 26 });
  });

  it("单格与区间都能解码，且与顺序无关", () => {
    expect(decodeMergeRange("A1:C1")).toEqual({
      top: 0,
      left: 0,
      bottom: 0,
      right: 2,
    });
    expect(decodeMergeRange("A5")).toEqual({
      top: 4,
      left: 0,
      bottom: 4,
      right: 0,
    });
    expect(decodeMergeRange("C3:A1")).toEqual({
      top: 0,
      left: 0,
      bottom: 2,
      right: 2,
    });
  });

  it("非法引用抛错", () => {
    expect(() => decodeCellRef("1A")).toThrow();
  });
});

describe("cellText", () => {
  it("覆盖字符串/数字/布尔/日期/富文本/公式结果/超链接/错误", () => {
    expect(cellText("张三")).toBe("张三");
    expect(cellText(0)).toBe("0");
    expect(cellText(false)).toBe("false");
    expect(cellText(new Date("2026-10-02T00:00:00Z"))).toBe("2026-10-02");
    expect(cellText({ richText: [{ text: "a" }, { text: "b" }] })).toBe("ab");
    expect(cellText({ text: "显示值", hyperlink: "https://x" })).toBe("显示值");
    expect(cellText({ formula: "SUM(A1:A2)", result: 3 })).toBe("3");
    expect(cellText({ error: "#DIV/0!" })).toBe("#DIV/0!");
    expect(cellText(null)).toBe("");
  });
});

describe("buildSheetGrid", () => {
  const grid = buildSheetGrid(makeWorkbook().getWorksheet("数学")!);

  it("行数列数与真实工作表一致", () => {
    expect(grid.name).toBe("数学");
    expect(grid.rowCount).toBeGreaterThanOrEqual(4);
    expect(grid.colCount).toBeGreaterThanOrEqual(3);
    expect(grid.rows).toHaveLength(grid.rowCount);
    expect(grid.rows[0]).toHaveLength(grid.colCount);
  });

  it("合并区域被正确标记：只有锚点负责渲染", () => {
    expect(grid.merges).toEqual([{ top: 0, left: 0, bottom: 0, right: 2 }]);
    expect(grid.rows[0][0].isMergeAnchor).toBe(true);
    expect(grid.rows[0][1].isMergedAway).toBe(true);
    expect(grid.rows[0][2].isMergedAway).toBe(true);
    expect(grid.rows[1][1].isMergedAway).toBe(false);
  });

  it("字体/对齐/换行/字号被保留（预览必须与导出件同源）", () => {
    const title = grid.rows[0][0];
    expect(title.bold).toBe(true);
    expect(title.align).toBe("center");
    expect(title.wrap).toBe(true);
    expect(title.fontSize).toBe(16);

    const header = grid.rows[1][1];
    expect(header.bold).toBe(true);
    expect(header.text).toBe("姓名");
  });

  it("富文本与公式结果按展示值渲染", () => {
    expect(grid.rows[2][2].text).toBe("第 3 题计算有误");
    expect(grid.rows[2][2].wrap).toBe(true);
    expect(grid.rows[3][1].text).toBe("1");
  });

  it("列宽与行高进入模型", () => {
    expect(grid.colWidths[0]).toBe(6);
    expect(grid.colWidths[1]).toBe(18);
    expect(grid.rowHeights[2]).toBe(60);
  });

  it("非空判断与摘要可用于降级文案", () => {
    expect(isGridEmpty(grid)).toBe(false);
    expect(summarizeGrid(grid)).toContain("数学：");
    expect(summarizeGrid(grid)).toContain("1 处合并");
  });

  it("空工作表被判定为空", () => {
    const wb = new ExcelJS.Workbook();
    const empty = wb.addWorksheet("空");
    expect(isGridEmpty(buildSheetGrid(empty))).toBe(true);
  });
});
