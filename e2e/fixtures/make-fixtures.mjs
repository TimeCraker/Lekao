#!/usr/bin/env node
/**
 * frontend-test 全流程 · 上传素材合成（skill 允许的「文件上传」例外，见路线文档）
 * 结构对齐：
 * - 错题集: src/lib/mistake/excel-parser.ts（姓名/堂测错题/作业错题，表头前 5 行内）
 * - 周末表: src/lib/mistake/weekend-parser.ts（R1 含日期标题，R2 表头，R3+ 学生）
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const HERE = dirname(fileURLToPath(import.meta.url));

async function main() {
  // ---- 错题集 ----
  const wb1 = new ExcelJS.Workbook();
  const ws1 = wb1.addWorksheet("三年二班《E2E测试》反馈表");
  ws1.addRow(["姓名", "堂测错题", "作业错题"]);
  ws1.addRow(["【E2E】张小明", "1, 2", "3"]);
  ws1.addRow(["【E2E】李小红", "全对", "5，7"]);
  const xlsxPath = resolve(HERE, "e2e-mistake.xlsx");
  mkdirSync(dirname(xlsxPath), { recursive: true });
  await wb1.xlsx.writeFile(xlsxPath);
  console.log("[fixtures] 写入", xlsxPath);

  // ---- 周末反馈表 ----
  const wb2 = new ExcelJS.Workbook();
  const ws2 = wb2.addWorksheet("周末反馈");
  ws2.addRow(["10月3日【E2E】周末错题反馈表"]);
  ws2.addRow(["序号", "姓名", "错题", "反馈"]);
  ws2.addRow([1, "【E2E】张小明", "", ""]);
  ws2.addRow([2, "【E2E】李小红", "", ""]);
  const weekendPath = resolve(HERE, "e2e-weekend.xlsx");
  await wb2.xlsx.writeFile(weekendPath);
  console.log("[fixtures] 写入", weekendPath);

  // ---- 非法文件（负例）----
  const badPath = resolve(HERE, "e2e-invalid.txt");
  writeFileSync(badPath, "this is not an excel file", "utf8");
  console.log("[fixtures] 写入", badPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
