const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/admin/BrokerQuoteImportPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// replace the catch block to include the keys of the first row
code = code.replace(
  'const totalTickers = Object.keys(mergedQuotes).length;',
  `const totalTickers = Object.keys(mergedQuotes).length;
      if (totalTickers === 0) {
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const sampleData = XLSX.utils.sheet_to_json(firstSheet)[0] || {};
        throw new Error("未能解析出任何数据。文件第一行的列名为: " + Object.keys(sampleData).join(", "));
      }`
);

// enhance the ticker extraction to be more robust for all 3
// Let's use sed/replace to inject a findTicker function
code = code.replace(
  'const [showDetail, setShowDetail] = useState<string | null>(null);',
  `const [showDetail, setShowDetail] = useState<string | null>(null);

  const getTickerFromRow = (item: any): string => {
    if (!item) return '';
    const keys = Object.keys(item);
    for (const key of keys) {
      const k = key.toLowerCase();
      if (k.includes('代码') || k === 'ticker' || k === 'code' || k === 'symbol') {
        return String(item[key]);
      }
    }
    return '';
  };`
);

code = code.replace(/if \(\!item \|\| \!item\.ticker\) continue;\n\s+const \{ ticker, name, Notional, \.\.\.rawQuotes \} \= item;/g, 
  `const ticker = getTickerFromRow(item);
      if (!ticker) continue;
      const { name, Notional, ...rawQuotes } = item;
      delete rawQuotes[Object.keys(item).find(k => k.toLowerCase().includes('代码') || k.toLowerCase() === 'ticker') || ''];`
);

code = code.replace(/const ticker = item\['证券代码'\] \|\| item\['代码'\];/g, `const ticker = getTickerFromRow(item);`);
code = code.replace(/let ticker = String\(item\['代码'\] \|\| item\['Code'\] \|\| item\['ticker'\] \|\| ''\);/g, `let ticker = getTickerFromRow(item);`);

fs.writeFileSync(file, code);
