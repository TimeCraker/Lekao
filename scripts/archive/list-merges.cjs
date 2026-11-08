const ExcelJS = require("exceljs");
(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile("C:/Users/TimeCraker/Desktop/my_workspace/lekao/public/templates/lekao-weekend-mistake-template.xlsx");
  const ws = wb.worksheets[0];
  console.log("ws._merges type:", typeof ws._merges);
  console.log("ws._merges keys:", Object.keys(ws._merges || {}));
  console.log("ws._merges:");
  if (ws._merges) {
    for (const [k, v] of Object.entries(ws._merges)) {
      console.log("  ", k, "->", JSON.stringify(v).slice(0, 100));
    }
  }
  console.log("ws.model.merges:", ws.model.merges);
})();