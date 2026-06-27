const ExcelJS = require("exceljs");
(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile("C:/Users/TimeCraker/Desktop/my_workspace/lekao/public/templates/lekao-weekend-mistake-template.xlsx");
  const ws = wb.worksheets[0];

  // 看 D19 cell 的所有属性
  const c = ws.getCell("D19");
  console.log("D19 cell:");
  console.log("  value:", c.value);
  console.log("  master:", c.master);
  console.log("  type:", c.type);
  console.log("  _mergeCount:", c._mergeCount);
  console.log("  mergeCount:", c.mergeCount);
  console.log("  addresses:", Object.keys(c));
  console.log("---");
  // 看 E19 cell
  const e = ws.getCell("E19");
  console.log("E19 cell:");
  console.log("  value:", e.value);
  console.log("  master:", e.master);
  console.log("  type:", e.type);
  console.log("---");
  // 找 sheet 里所有 _mergeMaster 之类的东西
  console.log("Worksheet model keys:", Object.keys(ws.model || {}));
  console.log("Sheet row 19 model:", JSON.stringify(ws.model.rows[18], null, 2).slice(0, 500));
})();