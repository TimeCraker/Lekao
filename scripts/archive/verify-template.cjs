const ExcelJS = require("exceljs");
(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile("C:/Users/TimeCraker/Desktop/my_workspace/lekao/public/templates/lekao-weekend-mistake-template.xlsx");
  const ws = wb.worksheets[0];
  console.log("Sheet:", ws.name);
  console.log("Merges:", ws.model.merges);
  console.log("D19-D38 cell master status:");
  for (let r = 19; r <= 38; r++) {
    const c = ws.getCell("D" + r);
    console.log("  D" + r + ":", c.value, c.master ? "[MASTER]" : "");
  }
  console.log("E19-E38 cell master status:");
  for (let r = 19; r <= 38; r++) {
    const c = ws.getCell("E" + r);
    console.log("  E" + r + ":", c.value, c.master ? "[MASTER]" : "");
  }
})();