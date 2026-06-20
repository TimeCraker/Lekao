/**
 * 生成标准 Excel 错题录入模板 v3
 * 来源：参考 docs/副本反馈表 8月12日.xlsx "化学" Sheet 真实结构
 *
 * 列结构（与真实业务表完全对齐）：
 *   序号 | 姓名 | 堂测分数 | 堂测错题 | 课后作业错题 | 课后作业评价
 *
 * 关键匹配（PRD §1.2 + 真实业务）：
 * - 6 列固定，不要让用户改列名
 * - 错题号格式："2 8" / "1（2 8）" / "针2" / "全对" / "上节课请假"（原样保留）
 * - 堂测分数：数字 0-100 / "F"（缺席）/ "上节课请假"
 * - 课后作业评价：自由文本
 * - 预分配 30 行（最多 30 人班级）
 * - Sheet 名加空格匹配真实表（" 化学冲刺班 "）
 *
 * 隐私：所有示例姓名改为通用常用名（张三/李四等）
 */

import ExcelJS from "exceljs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(
  __dirname,
  "..",
  "public",
  "templates",
  "lekao-mistake-template-v1.xlsx"
);

// 6 列固定（与真实反馈表完全一致）
const HEADERS = [
  "序号",
  "姓名",
  "堂测分数",
  "堂测错题",
  "课后作业错题",
  "课后作业评价",
];

const COL_WIDTHS = [8, 12, 10, 20, 20, 40];

// 通用示例姓名（替换真实学生隐私）
const SAMPLE_STUDENTS = [
  { no: 1,  name: "张三", score: 85, classroom: "6",       homework: "全对",       comment: "作业完成质量较高，解题思路清晰" },
  { no: 2,  name: "李四", score: 78, classroom: "7",       homework: "2 8",       comment: "对基础概念理解需加强" },
  { no: 3,  name: "王五", score: 100, classroom: "全对",    homework: "7",         comment: "综合题中未能完整运用所学方法" },
  { no: 4,  name: "赵六", score: 80, classroom: "6",       homework: "2 3 5",     comment: "公式应用错误，如混淆相近概念" },
  { no: 5,  name: "孙七", score: "F", classroom: "6 7",    homework: "8",         comment: "缺席堂测，需补考" },
  { no: 6,  name: "周八", score: 100, classroom: "全对",    homework: "上节课请假", comment: "上节课请假，本节作业顺延" },
  { no: 7,  name: "吴九", score: 90, classroom: "6",       homework: "7 8",       comment: "综合应用能力待提升" },
  { no: 8,  name: "郑十", score: 80, classroom: "6",       homework: "2 3 5",     comment: "审题不清导致失分" },
  { no: 9,  name: "冯十一", score: 90, classroom: "6",     homework: "4 5 7",     comment: "方法选择不当" },
  { no: 10, name: "陈十二", score: "上节课请假", classroom: "上节课请假", homework: "上节课请假", comment: "" },
];

const MAX_ROWS = 30; // 预分配最多 30 人班级
const TITLE_TEMPLATE = "理科精品班《{topic}》反馈表  {date}";

async function buildSheet(wb, sheetName, topic, date) {
  // Sheet 名加前后空格匹配真实表格式
  const name = ` ${sheetName} `;
  const ws = wb.addWorksheet(name, {
    properties: { defaultRowHeight: 22 },
  });

  // 列宽
  ws.columns = COL_WIDTHS.map((w) => ({ width: w }));

  // === Row 1: 标题（合并 6 列）===
  ws.mergeCells(1, 1, 1, 6);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = TITLE_TEMPLATE.replace("{topic}", topic).replace(
    "{date}",
    date,
  );
  titleCell.font = { bold: true, size: 16, color: { argb: "FF1E40AF" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  ws.getRow(1).height = 36;

  // === Row 2: 表头 ===
  HEADERS.forEach((h, i) => {
    const cell = ws.getCell(2, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF3B82F6" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });
  ws.getRow(2).height = 28;

  // === Row 3+: 数据 + 预分配空行 ===
  for (let i = 0; i < MAX_ROWS; i++) {
    const rowIdx = i + 3;
    const sample = SAMPLE_STUDENTS[i];

    if (sample) {
      ws.getCell(rowIdx, 1).value = sample.no;
      ws.getCell(rowIdx, 2).value = sample.name;
      ws.getCell(rowIdx, 3).value = sample.score;
      ws.getCell(rowIdx, 4).value = sample.classroom;
      ws.getCell(rowIdx, 5).value = sample.homework;
      ws.getCell(rowIdx, 6).value = sample.comment;
    } else {
      // 预分配空行：只填序号
      ws.getCell(rowIdx, 1).value = i + 1;
    }

    // 数据行边框
    for (let c = 1; c <= 6; c++) {
      const cell = ws.getCell(rowIdx, c);
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      cell.alignment = { vertical: "middle", horizontal: c === 2 || c === 6 ? "left" : "center" };
    }

    // 隔行底色
    if (i % 2 === 1) {
      for (let c = 1; c <= 6; c++) {
        ws.getCell(rowIdx, c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }
    }
  }

  // === 冻结表头（前 2 行）===
  ws.views = [{ state: "frozen", ySplit: 2 }];

  // === 输入提示（数据验证）===
  for (let i = 3; i <= 2 + MAX_ROWS; i++) {
    // 堂测分数：0-100 数字 / "F" / "上节课请假"
    ws.getCell(i, 3).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"0,50,60,70,80,90,100,F,上节课请假"'],
      showErrorMessage: true,
      errorTitle: "格式错误",
      error: "请填数字 0-100，或 F（缺席），或'上节课请假'",
    };
  }
}

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Lekao";
  wb.created = new Date();
  wb.title = "Lekao 错题集录入模板 v3";

  // 2 个示例学科 Sheet（化学 + 物理）
  await buildSheet(wb, "化学冲刺班", "物质材料", "2026-06-14");
  await buildSheet(wb, "物理火箭班", "力学基础", "2026-06-14");

  await wb.xlsx.writeFile(OUTPUT_PATH);
  console.log(`✅ 模板已生成: ${OUTPUT_PATH}`);
  console.log(`📊 Sheet 数: ${wb.worksheets.length}`);
  wb.eachSheet((ws) => console.log(`   - ${JSON.stringify(ws.name)}`));
  console.log(`📏 列数: 6 · 预分配行数: ${MAX_ROWS} 人`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});