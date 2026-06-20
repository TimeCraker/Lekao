/**
 * Excel 解析器单元测试（v2 兼容性升级）
 * 覆盖：
 * - 5/6/7 列结构兼容
 * - 堂测分数不被误识为堂测错题
 * - 班级名精确提取（标题行 regex）
 * - splitQNumbers 各种场景
 *
 * 跑法：npx -y tsx@4 scripts/test-parser.ts
 */

import {
  detectColumns,
  extractHeaderInfo,
  splitQNumbers,
} from "../src/lib/mistake/excel-parser";
import * as XLSX from "xlsx";

let pass = 0;
let fail = 0;
function assertEq(actual: unknown, expected: unknown, name: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`✅ ${name}`);
    pass++;
  } else {
    console.log(`❌ ${name}\n   expected: ${e}\n   actual:   ${a}`);
    fail++;
  }
}

// ============================================
// 列名识别（detectColumns）
// ============================================
console.log("\n=== detectColumns · 列名识别 ===");

// 5 列真实场景：姓名/堂测分数/堂测错题/课后作业错题/课后作业评价
const headers5 = [
  "姓名",
  "堂测分数",
  "堂测错题",
  "课后作业错题",
  "课后作业评价",
];
assertEq(
  detectColumns(headers5),
  { nameCol: 0, classroomCol: 2, homeworkCol: 3 },
  "5 列真实场景 · 堂测分数不被误识（v2 修复点）",
);

// 6 列（当前模板）
const headers6 = [
  "序号",
  "姓名",
  "堂测分数",
  "堂测错题",
  "课后作业错题",
  "课后作业评价",
];
assertEq(
  detectColumns(headers6),
  { nameCol: 1, classroomCol: 3, homeworkCol: 4 },
  "6 列当前模板",
);

// 7 列（加 1 个杂列在前面）
const headers7 = [
  "班级",
  "序号",
  "姓名",
  "堂测分数",
  "堂测错题",
  "课后作业错题",
  "课后作业评价",
];
assertEq(
  detectColumns(headers7),
  { nameCol: 2, classroomCol: 4, homeworkCol: 5 },
  "7 列结构 · 仍按列名识别",
);

// 4 列简化（只有姓名+堂测+作业，无分数列）
const headers4 = ["姓名", "堂测错题", "课后作业错题", "评价"];
assertEq(
  detectColumns(headers4),
  { nameCol: 0, classroomCol: 1, homeworkCol: 2 },
  "4 列简化结构",
);

// ============================================
// 班级提取（extractHeaderInfo）
// ============================================
console.log("\n=== extractHeaderInfo · 班级提取 ===");

// 构造真实场景的 5 列 workbook
function buildMockWorkbook(aoa: unknown[][]): XLSX.WorkBook {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "化学");
  return wb;
}

// 场景 1：真实标题"理科精品班《物质材料》反馈表  8月12日"
{
  const wb = buildMockWorkbook([
    ["理科精品班《物质材料》反馈表  8月12日"],
    ["姓名", "堂测分数", "堂测错题", "课后作业错题", "课后作业评价"],
    ["张三", 80, "6", "全对", "好"],
  ]);
  const r = extractHeaderInfo(wb, "化学");
  assertEq(r.classroomName, "理科精品班", "班级精确提取（带《》的标题）");
  assertEq(r.date, "2026-08-12", "日期精确提取（8月12日 → 2026-08-12）");
}

// 场景 2：标题"化学冲刺班"（无《》结构）
{
  const wb = buildMockWorkbook([
    ["化学冲刺班 9月1日"],
    ["姓名", "堂测分数", "堂测错题", "课后作业错题", "课后作业评价"],
    ["张三", 80, "6", "全对", "好"],
  ]);
  const r = extractHeaderInfo(wb, "化学");
  assertEq(r.classroomName, "化学冲刺班", "班级降级提取（无《》结构）");
}

// 场景 3：标题没班级信息 → 降级到 Sheet 名
{
  const wb = buildMockWorkbook([
    ["反馈表 2026-06-14"],
    ["姓名", "堂测分数", "堂测错题", "课后作业错题", "课后作业评价"],
    ["张三", 80, "6", "全对", "好"],
  ]);
  const r = extractHeaderInfo(wb, "化学");
  assertEq(r.classroomName, "化学", "班级 fallback 到 Sheet 名");
}

// 场景 4：标题"理科精品班《物质材料》反馈表 2026-06-14"（ISO 日期）
{
  const wb = buildMockWorkbook([
    ["理科精品班《物质材料》反馈表 2026-06-14"],
    ["姓名", "堂测分数", "堂测错题", "课后作业错题", "课后作业评价"],
    ["张三", 80, "6", "全对", "好"],
  ]);
  const r = extractHeaderInfo(wb, "化学");
  assertEq(r.classroomName, "理科精品班", "ISO 日期 + 班级精确提取");
  assertEq(r.date, "2026-06-14", "ISO 日期提取");
}

// ============================================
// 题号切分（splitQNumbers）
// ============================================
console.log("\n=== splitQNumbers · 题号切分 ===");

assertEq(splitQNumbers(""), [], "空字符串");
assertEq(splitQNumbers("1, 2, 7"), ["1", "2", "7"], "英文逗号");
assertEq(splitQNumbers("1，2，7"), ["1", "2", "7"], "中文逗号");
assertEq(splitQNumbers("1 2 3"), ["1", "2", "3"], "空格");
assertEq(splitQNumbers("1（2 8）"), ["1（2 8）"], "括号不切分 · 大题粒度");
assertEq(splitQNumbers("1（2 8）2（7）"), ["1（2 8）", "2（7）"], "多括号大题");
assertEq(splitQNumbers("针2 全对"), ["针2", "全对"], "字符串原样保留");
assertEq(splitQNumbers("  1  2  "), ["1", "2"], "去前后空格");

// ============================================
// 总结
// ============================================
console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
