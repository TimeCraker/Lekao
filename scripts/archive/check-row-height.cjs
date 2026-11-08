/**
 * 检查模板原行高
 */
const ExcelJS = require("exceljs");
(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile("C:/Users/TimeCraker/Desktop/my_workspace/lekao/public/templates/lekao-weekend-mistake-template.xlsx");
  const ws = wb.worksheets[0];
  console.log("=== 模板 R1-R10 行高 ===");
  for (let r = 1; r <= 10; r++) {
    const row = ws.getRow(r);
    console.log(`R${r}: height = ${row.height ?? "默认"}`);
  }
  // 看默认行高
  console.log("---");
  console.log("ws.properties.defaultRowHeight:", ws.properties?.defaultRowHeight);
  console.log("Sheet 实际默认行高（ExcelJS 文档）: 15");
})();
