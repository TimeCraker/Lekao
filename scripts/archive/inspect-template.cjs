const ExcelJS = require('exceljs');
(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('C:/Users/TimeCraker/Documents/lekao weekend/lekao-weekend-mistake-template.xlsx');
  const ws = wb.worksheets[0];
  console.log('Sheet:', ws.name);
  console.log('Merge cells:');
  if (ws.model && ws.model.merges) {
    ws.model.merges.forEach(m => console.log('  ', m));
  }
  console.log('Row 2 headers:');
  const r2 = ws.getRow(2);
  for (let c = 1; c <= 5; c++) {
    console.log('  Col ' + c + ':', r2.getCell(c).value);
  }
  console.log('Row 19-38 D column:');
  for (let r = 19; r <= 38; r++) {
    const cell = ws.getCell('D' + r);
    const master = cell.master ? ' [MASTER]' : '';
    console.log('  D' + r + ':', JSON.stringify(cell.value), master);
  }
})();