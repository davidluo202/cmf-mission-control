const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/admin/BrokerQuoteImportPage.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldCitic = `  // 解析中信资本文件
  const parseCITIC = (workbook: XLSX.WorkBook): Record<string, Record<string, number>> => {
    const sheetName = workbook.SheetNames.find(n => n.includes('香草看涨报价')) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // 这里使用基于列的具体实现，暂时用泛型化处理
    const data = XLSX.utils.sheet_to_json(sheet) as any[];
    
    const mergedQuotes: Record<string, Record<string, number>> = {};
    // 假设A列是代码，后续根据具体格式再细化
    for (const item of data) {
      const ticker = getTickerFromRow(item);
      if (!ticker) continue;
      
      // ...实际解析映射将在此处完善...
      // 例如：mergedQuotes[ticker] = { "1M_100C": item['1M(100call)'] || 0.05 }
      mergedQuotes[ticker] = { "1M_100C": 0.05, "2M_100C": 0.06 }; 
    }
    return mergedQuotes;
  };`;

const newCitic = `  // 解析中信资本文件
  const parseCITIC = (workbook: XLSX.WorkBook): Record<string, Record<string, number>> => {
    const sheetName = workbook.SheetNames.find(n => n.includes('香草') || n.includes('看涨')) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // 采用矩阵模式解析，避免多行表头导致的 key 错乱
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    const mergedQuotes: Record<string, Record<string, number>> = {};
    for (const row of rows) {
      if (!row || !row[0]) continue;
      let ticker = String(row[0]).trim();
      // 简单判断A列是否像股票代码（至少包含4位数字）
      if (!/\\d{4,}/.test(ticker)) continue;
      
      if (!ticker.includes('.')) {
          if (ticker.startsWith('6')) ticker += '.SH';
          else if (ticker.startsWith('0') || ticker.startsWith('3')) ticker += '.SZ';
      }

      // 根据实际列映射 (0-indexed):
      // A(0)=代码, B(1)=简称
      // C-F(2-5): 100call — 1M/2M/3M/6M
      // G-J(6-9): 80call
      // K-N(10-13): 90call
      // O-R(14-17): 8080
      // S-V(18-21): 9090
      // W-Z(22-25): 9080
      // AA-AD(26-29): 9070
      // AE-AH(30-33): 103call
      // AI-AL(34-37): 105call

      mergedQuotes[ticker] = {
        "1M_100C": Number(row[2]) || 0,
        "2M_100C": Number(row[3]) || 0,
        "3M_100C": Number(row[4]) || 0,
        "6M_100C": Number(row[5]) || 0,
        
        "1M_80C": Number(row[6]) || 0,
        "2M_80C": Number(row[7]) || 0,
        "3M_80C": Number(row[8]) || 0,
        "6M_80C": Number(row[9]) || 0,
        
        "1M_90C": Number(row[10]) || 0,
        "2M_90C": Number(row[11]) || 0,
        "3M_90C": Number(row[12]) || 0,
        "6M_90C": Number(row[13]) || 0,

        "1M_103C": Number(row[30]) || 0,
        "2M_103C": Number(row[31]) || 0,
        "3M_103C": Number(row[32]) || 0,
        "6M_103C": Number(row[33]) || 0,

        "1M_105C": Number(row[34]) || 0,
        "2M_105C": Number(row[35]) || 0,
        "3M_105C": Number(row[36]) || 0,
        "6M_105C": Number(row[37]) || 0,
      };
      
      // 去除值为0的无效字段
      Object.keys(mergedQuotes[ticker]).forEach(k => {
        if (mergedQuotes[ticker][k] === 0) {
          delete mergedQuotes[ticker][k];
        }
      });
    }
    return mergedQuotes;
  };`;

// Also bump version to v1.2.2
code = code.replace(oldCitic, newCitic);
code = code.replace('v1.2.1', 'v1.2.2');
fs.writeFileSync(file, code);
