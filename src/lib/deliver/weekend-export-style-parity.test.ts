import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  buildExportWorkbook,
  loadWeekendWorkbookForExport,
} from "@/lib/mistake/weekend-exporter";
import type { WeekendSheet } from "@/lib/mistake/weekend-types";

/**
 * S04 T-403 · 周末反馈表「导出前预览 = 导出件」的样式保真断言
 *
 * 用真实 exceljs 模板构造 → 走真实导出路径（loadWeekendWorkbookForExport → buildExportWorkbook）
 * → 再写回字节重新加载校验。
 *
 * 断言的是**真实契约**，不是想象出来的契约：
 * - 标题合并（R1）与 R1/R2 字体必须保留；
 * - **非标题合并会被刻意剥离**（updateSheetInPlace 的 stripNonTitleMerges，防老模板写入失败）；
 * - **列宽与数据行高由导出器按内容重算**（Stage 11 起既定行为：serial 4–10、name 10–24、
 *   错题列 10–24、反馈列 18–70，数据行高统一 20，R1 行高 38），不是样式丢失；
 * - 写出的字节必须能被重新加载（文件有效）且值/样式仍在。
 */
const HEADERS = ["序号", "姓名", "作业错题", "堂测错题", "反馈"];

async function makeTemplateFile(): Promise<File> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("数学");
  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 20;
  ws.getColumn(4).width = 20;
  ws.getColumn(5).width = 30;

  ws.getCell("A1").value = "2026超火1班数学【反馈表】2026-10-02";
  ws.mergeCells("A1:E1");
  ws.getCell("A1").font = { bold: true, size: 16 };
  ws.getCell("A1").alignment = { horizontal: "center" };

  HEADERS.forEach((h, i) => {
    const cell = ws.getCell(2, i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center" };
  });

  ws.getCell("A3").value = 1;
  ws.getCell("B3").value = "张三";
  ws.getCell("C3").value = "3，6";
  ws.getCell("E3").value = "旧的反馈内容";
  ws.getCell("A4").value = 2;
  ws.getCell("B4").value = "李四";
  ws.getCell("C4").value = "全对";
  ws.mergeCells("C3:D3"); // 非标题合并：导出时会被刻意剥离
  ws.getRow(3).height = 40;

  const buf = await wb.xlsx.writeBuffer();
  return new File([buf], "反馈表.xlsx");
}

function makeEditedSheets(): WeekendSheet[] {
  return [
    {
      sheetName: "数学",
      originalTitle: "2026超火1班数学【反馈表】2026-10-02",
      updatedTitle: "2026超火1班数学【反馈表】2026-10-02",
      classroomHint: "2026超火1班",
      detectedDate: "2026-10-02",
      newDate: "2026-10-02",
      cols: 5,
      fieldColumns: { serial: 1, name: 2, qNumbersCols: [3, 4], feedback: 5 },
      rawRows: [],
      students: [
        {
          rowIndex: 2,
          serialNumber: "1",
          name: "张三",
          qNumbersInput: "3，6",
          feedback: "张三反馈：第 3 题与第 6 题计算有误，已订正。",
        },
        {
          rowIndex: 3,
          serialNumber: "2",
          name: "李四",
          qNumbersInput: "全对",
          feedback: "李四本次全对，保持。",
        },
      ],
    },
  ];
}

function facts(ws: ExcelJS.Worksheet) {
  return {
    merges: [...(((ws.model?.merges as string[]) ?? []) as string[])].sort(),
    widths: ws.columns.map((c) => (c?.width === undefined ? null : c.width)),
    titleFont: { ...ws.getCell("A1").font },
    headerFont: { ...ws.getCell(2, 1).font },
    row1Height: ws.getRow(1).height,
  };
}

describe("weekend export style parity", () => {
  it("预览/导出后：值按编辑结果变化，标题合并与 R1/R2 样式保留", async () => {
    const file = await makeTemplateFile();
    const wb = await loadWeekendWorkbookForExport(file);
    const ws = wb.getWorksheet("数学")!;

    const before = facts(ws);
    expect(before.merges).toContain("A1:E1");
    expect(before.merges).toContain("C3:D3");

    buildExportWorkbook(wb, makeEditedSheets());

    const after = facts(ws);
    // 值：按编辑后的 students 顺序写入 R3+
    expect(ws.getCell("B3").value).toBe("张三");
    expect(ws.getCell("E3").value).toBe(
      "张三反馈：第 3 题与第 6 题计算有误，已订正。",
    );
    expect(ws.getCell("B4").value).toBe("李四");
    expect(ws.getCell("E4").value).toBe("李四本次全对，保持。");

    // 标题合并保留；非标题合并按既有行为被剥离（防老模板写入失败）
    expect(after.merges).toContain("A1:E1");
    expect(after.merges).not.toContain("C3:D3");

    // R1/R2 样式保留
    expect(after.titleFont.bold).toBe(true);
    expect(after.titleFont.size).toBe(16);
    expect(after.headerFont.bold).toBe(true);

    // 列宽：按内容重算并落在既定 clamp 内（Stage 11 行为），不是保留模板原值
    const w = after.widths.map((x) => x ?? 0);
    expect(w[0]).toBeGreaterThanOrEqual(4);
    expect(w[0]).toBeLessThanOrEqual(10); // 序号
    expect(w[1]).toBeGreaterThanOrEqual(10);
    expect(w[1]).toBeLessThanOrEqual(24); // 姓名
    expect(w[2]).toBeGreaterThanOrEqual(10);
    expect(w[2]).toBeLessThanOrEqual(24); // 错题
    expect(w[4]).toBeGreaterThanOrEqual(18);
    expect(w[4]).toBeLessThanOrEqual(70); // 反馈
    // 本 fixture 下为确定性结果（serial=5、name=10、错题=10、反馈=“长中文+4 padding”）
    expect(w[0]).toBe(5);
    expect(w[4]).toBeGreaterThan(w[1]);

    // R1 行高为刻意设置值；数据行高统一 20（Stage 11 既定行为）
    expect(after.row1Height).toBe(38);
    expect(ws.getRow(3).height).toBe(20);
  });

  it("写出的字节可被重新加载，且值与样式仍在（文件有效）", async () => {
    const file = await makeTemplateFile();
    const wb = await loadWeekendWorkbookForExport(file);
    buildExportWorkbook(wb, makeEditedSheets());

    const buf = await wb.xlsx.writeBuffer();
    const reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(buf as ArrayBuffer);
    const ws = reloaded.getWorksheet("数学")!;

    expect(ws.getCell("E3").value).toBe(
      "张三反馈：第 3 题与第 6 题计算有误，已订正。",
    );
    const reloadedFacts = facts(ws);
    expect(reloadedFacts.merges).toContain("A1:E1");
    expect(reloadedFacts.titleFont.bold).toBe(true);
    expect(reloadedFacts.widths[0]).toBe(5); // 导出器重算后的序号列宽
  });

  it("空学生列表不破坏模板（标题与表头原样保留）", async () => {
    const file = await makeTemplateFile();
    const wb = await loadWeekendWorkbookForExport(file);
    const sheets = makeEditedSheets();
    sheets[0].students = [];

    buildExportWorkbook(wb, sheets);

    const ws = wb.getWorksheet("数学")!;
    expect(ws.getCell("A1").value).toContain("反馈表");
    expect(ws.getCell(2, 5).value).toBe("反馈");
    expect(facts(ws).merges).toContain("A1:E1");
  });
});
