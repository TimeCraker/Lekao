/**
 * 生成标准 Excel 错题录入模板 (T24)
 * 来源：PRD §3.5.5 + STAGE spec §3 T24
 *
 * 列结构（按 PRD §3.5.5）：
 * - 姓名：必填
 * - 堂测分数：可选
 * - 堂测错题：必填，逗号/空格分隔，如 "1, 2（3 5）, 针2"
 * - 课后作业错题：可选，同上格式
 * - 课后作业评价：可选
 *
 * 多 Sheet 兼容：每个 Sheet 是一个学科
 */

import ExcelJS from "exceljs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "public", "templates", "lekao-mistake-template-v1.xlsx");

const TEMPLATE_DATA = [
  // 标题行（可读性说明）
  ["Lekao 错题集录入模板 v2", "", "", "", ""],
  ["", "", "", "", ""],
  ["日期", "2026-06-14", "班级", "化学冲刺班", ""],
  ["", "", "", "", ""],
  // 表头
  ["姓名", "堂测分数", "堂测错题", "课后作业错题", "课后作业评价"],
  // 示例数据（用户可删除）
  ["陈佳昕", 80, "6", "全对", "良好"],
  ["冯语秋", 78, "7", "2 8", "需订正"],
  ["贺梓晗", 92, "", "", "全对"],
  ["李明轩", 65, "1, 2, 6", "1（2 8）, 3", "基础薄弱"],
  ["", "", "", "", ""],
  ["", "", "", "", ""],
  ["使用说明", "", "", "", ""],
  ["1. 列名不要修改", "", "", "", ""],
  ["2. 错题号用逗号或空格分隔", "", "", "", ""],
  ["3. 大题带括号的不拆（如 1（2 8）= 1 道大题）", "", "", "", ""],
  ["4. 针2 / 全对 / 未交 等字符串原样保留", "", "", "", ""],
  ["5. 每 Sheet = 1 个学科", "", "", "", ""],
];

const COL_WIDTHS = [16, 12, 28, 28, 16];

const wb = new ExcelJS.Workbook();
wb.creator = "Lekao";
wb.created = new Date();

// Sheet 1：化学（示例）
const chemSheet = wb.addWorksheet("化学冲刺班", {
  properties: { defaultRowHeight: 20 },
});
chemSheet.columns = COL_WIDTHS.map((w) => ({ width: w }));

// 写入数据
TEMPLATE_DATA.forEach((row, idx) => {
  const excelRow = chemSheet.getRow(idx + 1);
  row.forEach((cell, colIdx) => {
    excelRow.getCell(colIdx + 1).value = cell;
  });
});

// 美化样式
chemSheet.getRow(1).font = { bold: true, size: 14, color: { argb: "FF1E40AF" } };
chemSheet.getRow(5).font = { bold: true, color: { argb: "FFFFFFFF" } };
chemSheet.getRow(5).fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF3B82F6" },
};
chemSheet.getRow(5).alignment = { vertical: "middle", horizontal: "center" };

// 数据行边框
for (let i = 6; i <= 9; i++) {
  chemSheet.getRow(i).eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    };
  });
}

// 冻结表头
chemSheet.views = [{ state: "frozen", ySplit: 5 }];

// Sheet 2：物理（空模板，用户可填）
const physSheet = wb.addWorksheet("物理火箭班", {
  properties: { defaultRowHeight: 20 },
});
physSheet.columns = COL_WIDTHS.map((w) => ({ width: w }));

// 写表头
const physHeader = physSheet.getRow(5);
["姓名", "堂测分数", "堂测错题", "课后作业错题", "课后作业评价"].forEach(
  (text, i) => {
    physHeader.getCell(i + 1).value = text;
  },
);
physHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
physHeader.fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF3B82F6" },
};
physHeader.alignment = { vertical: "middle", horizontal: "center" };
physSheet.views = [{ state: "frozen", ySplit: 5 }];

// 写日期
const physTitleRow = physSheet.getRow(1);
physTitleRow.getCell(1).value = "Lekao 错题集录入模板 v2";
physTitleRow.getCell(1).font = {
  bold: true,
  size: 14,
  color: { argb: "FF1E40AF" },
};

const physDateRow = physSheet.getRow(3);
physDateRow.getCell(1).value = "日期";
physDateRow.getCell(2).value = "2026-06-14";
physDateRow.getCell(3).value = "班级";
physDateRow.getCell(4).value = "物理火箭班";

// 保存
await wb.xlsx.writeFile(OUTPUT_PATH);
console.log(`✅ 模板已生成: ${OUTPUT_PATH}`);
console.log(`📊 包含 Sheet 数: ${wb.worksheets.length}`);
wb.eachSheet((ws) => {
  console.log(`   - ${ws.name}`);
});