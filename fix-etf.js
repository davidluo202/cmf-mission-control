const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/admin/BrokerQuoteImportPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// For CITIC_CAP, ETFs might start with 5 or 1
code = code.replace(
  `if (ticker.startsWith('0') || ticker.startsWith('3')) ticker += '.SZ';`,
  `if (ticker.startsWith('0') || ticker.startsWith('3')) ticker += '.SZ';
          else if (ticker.startsWith('5') || ticker.startsWith('1')) {
            // roughly: 51xxxx -> SH, 15xxxx -> SZ
            if (ticker.startsWith('5')) ticker += '.SH';
            else ticker += '.SZ';
          }`
);

// Add _type logic to CITIC_CAP
code = code.replace(
  `_name: String(row[1] || '').trim() as any,`,
  `_name: String(row[1] || '').trim() as any,
        _type: (ticker.startsWith('5') || ticker.startsWith('1')) ? 'etf' : 'stock' as any,`
);

// For CICC, fix processSheet call to match loosely instead of exact 'ETF'
const oldCiccProcess = `    processSheet('个股', false);\n    processSheet('ETF', true);`;
const newCiccProcess = `    const findSheet = (keywords: string[]) => workbook.SheetNames.find(n => keywords.some(k => n.toUpperCase().includes(k)));
    const stockSheet = findSheet(['个股', 'STOCK']);
    if (stockSheet) processSheet(stockSheet, false);
    const etfSheet = findSheet(['ETF', '基金']);
    if (etfSheet) processSheet(etfSheet, true);
    // 如果都没有，随便取第一个
    if (!stockSheet && !etfSheet && workbook.SheetNames.length > 0) {
       processSheet(workbook.SheetNames[0], false);
    }`;
code = code.replace(oldCiccProcess, newCiccProcess);

// Same prefix logic for CICC
code = code.replace(
  `else if (ticker.startsWith('0') || ticker.startsWith('3') || ticker.startsWith('1') || ticker.startsWith('5')) ticker += '.SZ'; // ETFs can start with 1 or 5`,
  `else if (ticker.startsWith('0') || ticker.startsWith('3') || ticker.startsWith('1') || ticker.startsWith('5')) {
            if (ticker.startsWith('5')) ticker += '.SH';
            else ticker += '.SZ';
          }`
);

// Update versions
code = code.replace(/v1\.0\.260303\.015/g, 'v1.0.260303.016');

fs.writeFileSync(file, code);
