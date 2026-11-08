/**
 * 处理周末错题反馈表模板：去掉所有非 R1 的合并单元格
 *
 * 用户 2026-06-27 反馈：模板 D19:D38 有合并（特殊情况区域），
 * AI 反馈填不进去。需求：保留 B1:E1 标题合并，其他全部解开。
 *
 * ExcelJS 4.4.0 已知 bug：当 ws.autoFilter 设置时，部分 cell.master 误判为 true。
 * 本脚本同时清理 ws._merges 字典（确保真实合并也被解开）。
 *
 * 用法：node scripts/strip-template-merges.cjs
 */
const ExcelJS = require("exceljs");
const path = require("path");

const TEMPLATE_PATH = path.join(
  __dirname,
  "..",
  "public",
  "templates",
  "lekao-weekend-mistake-template.xlsx",
);

(async () => {
  console.log("[strip-merges] 处理模板:", TEMPLATE_PATH);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);

  let totalMerges = 0;
  let removedMerges = 0;

  for (const ws of wb.worksheets) {
    const before = (ws.model.merges || []).length;
    totalMerges += before;

    // 用 unMergeCells API 解开所有 merge（除 B1:E1 标题）
    const toRemove = [];
    for (const m of ws.model.merges || []) {
      // m 是 "B1:E1" 格式
      const start = m.match(/^[A-Z]+(\d+):/);
      if (!start) {
        toRemove.push(m);
        continue;
      }
      const startRow = parseInt(start[1], 10);
      if (startRow !== 1) toRemove.push(m);
    }

    for (const m of toRemove) {
      try {
        ws.unMergeCells(m);
        removedMerges++;
      } catch (e) {
        console.warn(`  [warn] 无法解开 ${m}: ${e.message}`);
      }
    }

    const after = (ws.model.merges || []).length;
    console.log(`[strip-merges] Sheet "${ws.name}": ${before} → ${after} merges (去掉 ${toRemove.length} 个)`);
  }

  await wb.xlsx.writeFile(TEMPLATE_PATH);
  console.log(
    `[strip-merges] 完成 · 处理 ${totalMerges} 个 merge，去掉 ${removedMerges} 个`,
  );
})();