/**
 * 一次性脚本: 生成错题集 Excel 模板
 * 用法: node scripts/generate-templates.mjs
 * 输出: public/templates/lekao-mistake-template-v1.xlsx
 *
 * PRD §3.5.5: 错题集模板 v1
 * 列: 题号 | 题目 | 答案 | 错题人数 | 错误原因
 */
import ExcelJS from "exceljs";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "..", "public", "templates");
const OUT_FILE = resolve(OUT_DIR, "lekao-mistake-template-v1.xlsx");

mkdirSync(OUT_DIR, { recursive: true });

const wb = new ExcelJS.Workbook();
wb.creator = "Lekao";
wb.created = new Date("2026-06-20");

const sheet = wb.addWorksheet("错题录入", {
  views: [{ state: "frozen", ySplit: 1 }], // 首行冻结
});

// 列定义
sheet.columns = [
  { header: "题号", key: "no", width: 10 },
  { header: "题目", key: "content", width: 60 },
  { header: "答案", key: "answer", width: 20 },
  { header: "错题人数", key: "wrongCount", width: 12 },
  { header: "错误原因", key: "reason", width: 30 },
];

// 表头样式
const headerRow = sheet.getRow(1);
headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
headerRow.fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF3B82F6" }, // accent blue
};
headerRow.alignment = { vertical: "middle", horizontal: "center" };
headerRow.height = 28;

// 数据校验: 错题人数 1-30
sheet.getColumn("wrongCount").eachCell({ includeEmpty: false }, (cell, row) => {
  if (row > 1) {
    cell.dataValidation = {
      type: "whole",
      operator: "between",
      formulae: [1, 30],
      showErrorMessage: true,
      errorTitle: "错题人数超出范围",
      error: "请填写 1-30 之间的整数",
    };
  }
});

// 示例数据
sheet.addRow({
  no: "1",
  content: "解方程: x² - 5x + 6 = 0",
  answer: "x = 2 或 x = 3",
  wrongCount: 8,
  reason: "判别式符号判断错误",
});
sheet.addRow({
  no: "2",
  content: "",
  answer: "",
  wrongCount: "",
  reason: "",
});

// 第二行数据单元格样式 (浅灰底, 提示用户这是示例)
sheet.getRow(2).eachCell({ includeEmpty: true }, (cell) => {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" }, // canvas-alt
  };
  cell.font = { italic: true, color: { argb: "FF94A3B8" } };
});

// 第二行批注: 提示这是示例
sheet.getCell("A2").note = "这是示例行, 上传前请删除";

// 边框
sheet.eachRow({ includeEmpty: false }, (row) => {
  row.eachCell({ includeEmpty: false }, (cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };
  });
});

await wb.xlsx.writeFile(OUT_FILE);
console.log(`✓ 已生成: ${OUT_FILE}`);
