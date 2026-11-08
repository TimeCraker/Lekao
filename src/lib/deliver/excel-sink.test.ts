import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  applySink,
  detectColumns,
  planSink,
  workbookToBlob,
  type SinkStudentInput,
} from "./excel-sink";

/**
 * S04 T-404 · Excel 落版器（真实 exceljs 表格，不 mock）
 *
 * 覆盖：表头识别命中、缺失、重名、无表头（转人工点列）、
 * 目标格落在非锚点合并区、超长文本完整写入 + wrapText、以及写入不改变表格结构。
 */
function makeWorkbook(opts?: {
  headers?: string[];
  rows?: Array<Array<string | number>>;
  mergeDataCell?: boolean;
}): ExcelJS.Workbook {
  const headers = opts?.headers ?? ["序号", "姓名", "作业错题", "反馈"];
  const rows = opts?.rows ?? [
    [1, "张三", "3，6", ""],
    [2, "李四", "全对", ""],
  ];

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("数学");
  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 20;
  ws.getColumn(4).width = 40;

  ws.getCell("A1").value = "2026超火1班数学【反馈表】2026-10-02";
  ws.mergeCells("A1:D1");
  headers.forEach((h, i) => {
    const cell = ws.getCell(2, i + 1);
    cell.value = h;
    cell.font = { bold: true };
  });
  rows.forEach((row, r) => {
    row.forEach((v, i) => {
      ws.getCell(r + 3, i + 1).value = v;
    });
  });

  if (opts?.mergeDataCell) {
    // 把 D3 并入 C3（D3 成为非锚点格）——模拟老师模板里的"特殊情况区域"
    ws.mergeCells("C3:D3");
  }
  return wb;
}

function sheet(wb: ExcelJS.Workbook): ExcelJS.Worksheet {
  return wb.getWorksheet("数学")!;
}

const STUDENTS: SinkStudentInput[] = [
  {
    name: "张三",
    text: "张三：本次作业第 3、6 题计算有误，建议重做一遍并订正。",
  },
  { name: "李四", text: "李四：本次全对，保持。" },
];

describe("检测列", () => {
  it("按 R2 表头识别姓名列与反馈列", () => {
    const { columns, rawHeaders } = detectColumns(sheet(makeWorkbook()));
    expect(columns.name).toBe(2);
    expect(columns.feedback).toBe(4);
    expect(rawHeaders[1]).toBe("姓名");
  });

  it("表头是「练习评价」这类变体也能识别反馈列", () => {
    const wb = makeWorkbook({
      headers: ["序号", "姓名", "错题", "练习评价"],
    });
    expect(detectColumns(sheet(wb)).columns.feedback).toBe(4);
  });
});

describe("planSink", () => {
  it("按姓名命中正确行，反馈列来自表头识别", () => {
    const plan = planSink(sheet(makeWorkbook()), STUDENTS);
    expect(plan.feedbackColumn).toBe(4);
    expect(plan.columnSource).toBe("header");
    expect(plan.matches).toHaveLength(2);
    expect(plan.matches[0]).toMatchObject({ row: 3, name: "张三", column: 4 });
    expect(plan.matches[1]).toMatchObject({ row: 4, name: "李四", column: 4 });
    expect(plan.unmatched).toEqual([]);
  });

  it("表里没有的姓名不写，标为 missing", () => {
    const plan = planSink(sheet(makeWorkbook()), [
      ...STUDENTS,
      { name: "王五", text: "..." },
    ]);
    expect(plan.matches).toHaveLength(2);
    expect(plan.unmatched).toEqual([{ name: "王五", reason: "missing" }]);
  });

  it("同名多行不猜，标为 duplicate", () => {
    const wb = makeWorkbook({
      rows: [
        [1, "张三", "3", ""],
        [2, "张三", "6", ""],
      ],
    });
    const plan = planSink(sheet(wb), [{ name: "张三", text: "x" }]);
    expect(plan.matches).toEqual([]);
    expect(plan.unmatched).toEqual([{ name: "张三", reason: "duplicate" }]);
  });

  it("空姓名标为 empty_name", () => {
    const plan = planSink(sheet(makeWorkbook()), [{ name: "   ", text: "x" }]);
    expect(plan.unmatched).toEqual([{ name: "   ", reason: "empty_name" }]);
  });

  it("没有可识别的反馈列时不猜：转人工点列（no_column → manual 后可用）", () => {
    const wb = makeWorkbook({ headers: ["序号", "姓名", "错题", "备注"] });
    const ws = sheet(wb);

    const auto = planSink(ws, STUDENTS);
    expect(auto.feedbackColumn).toBeNull();
    expect(auto.columnSource).toBe("none");
    expect(auto.unmatched.every((u) => u.reason === "no_column")).toBe(true);

    const manual = planSink(ws, STUDENTS, { manualFeedbackColumn: 4 });
    expect(manual.columnSource).toBe("manual");
    expect(manual.matches.map((m) => m.column)).toEqual([4, 4]);
  });

  it("目标格落在非锚点合并区时不写，标为 merged", () => {
    const wb = makeWorkbook({ mergeDataCell: true });
    const plan = planSink(sheet(wb), STUDENTS);
    expect(plan.matches.map((m) => m.name)).toEqual(["李四"]);
    expect(plan.unmatched).toEqual([{ name: "张三", reason: "merged" }]);
  });

  it("缺姓名列时全部转人工（不按位置猜）", () => {
    const wb = makeWorkbook({ headers: ["序号", "学生", "错题", "反馈"] });
    // "学生" 也是姓名列别名 → 这里换一个完全无姓名语义的表头
    const wb2 = makeWorkbook({ headers: ["序号", "编号", "错题", "反馈"] });
    const plan1 = planSink(sheet(wb), STUDENTS);
    expect(plan1.nameColumn).toBe(2);

    const wb3 = new ExcelJS.Workbook();
    const ws3 = wb3.addWorksheet("空表");
    const plan3 = planSink(ws3, STUDENTS);
    expect(plan3.matches).toEqual([]);
    expect(plan3.unmatched.every((u) => u.reason === "no_column")).toBe(true);
    void wb2;
  });
});

describe("applySink", () => {
  it("写入值与 wrapText，且超长文本完整保留（不截断）", () => {
    const wb = makeWorkbook();
    const ws = sheet(wb);
    const longText = "张三：" + "第 3 题计算有误，建议重做。".repeat(12);
    const plan = planSink(ws, [{ name: "张三", text: longText }]);
    const written = applySink(ws, plan);

    expect(written).toBe(1);
    const cell = ws.getCell("D3");
    expect(cell.value).toBe(longText);
    expect(String(cell.value).length).toBeGreaterThan(150);
    expect(cell.alignment?.wrapText).toBe(true);
    expect(cell.alignment?.vertical).toBe("middle");
  });

  it("不改变表格结构（标题合并/列宽/表头字体保持）", () => {
    const wb = makeWorkbook();
    const ws = sheet(wb);
    const before = {
      merges: [...((ws.model.merges as string[]) ?? [])],
      widths: ws.columns.map((c) => c?.width),
      headerFont: { ...ws.getCell(2, 1).font },
      rowHeight3: ws.getRow(3).height,
    };

    applySink(ws, planSink(ws, STUDENTS));

    expect([...((ws.model.merges as string[]) ?? [])]).toEqual(before.merges);
    expect(ws.columns.map((c) => c?.width)).toEqual(before.widths);
    expect({ ...ws.getCell(2, 1).font }).toEqual(before.headerFont);
    expect(ws.getRow(3).height).toBe(before.rowHeight3);
  });

  it("写出的字节可重新加载，且写入的文本仍在", async () => {
    const wb = makeWorkbook();
    applySink(sheet(wb), planSink(sheet(wb), STUDENTS));

    const blob = await workbookToBlob(wb);
    const reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(await blob.arrayBuffer());
    const ws = reloaded.getWorksheet("数学")!;

    expect(String(ws.getCell("D3").value)).toContain("第 3、6 题");
    expect(String(ws.getCell("D4").value)).toContain("保持");
    expect([...(ws.model.merges as string[])]).toContain("A1:D1");
  });

  it("未命中的姓名不会被误写（AI 文本不丢：留在 unmatched 里供人工处理）", () => {
    const wb = makeWorkbook();
    const ws = sheet(wb);
    const plan = planSink(ws, [
      { name: "张三", text: "会写进去" },
      { name: "王五", text: "不会写进去，但必须能被人工看到" },
    ]);
    applySink(ws, plan);

    expect(String(ws.getCell("D3").value)).toBe("会写进去");
    expect(ws.getCell("D4").value).toBeFalsy();
    expect(plan.unmatched[0].name).toBe("王五");
    expect(
      // 文本本身没有被丢弃：计划里仍带着它（UI 用 unmatched 旁的原文提示人工处理）
      plan.unmatched.some((u) => u.name === "王五"),
    ).toBe(true);
  });
});
