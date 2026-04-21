const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/admin/BrokerQuoteImportPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// Fix CICC clear
code = code.replace(
  /const ubsRaw = localStorage\.getItem\(`\$\{STORAGE_KEY_PREFIX\}UBS`\);\n\s*const data: Record<string, QuoteRecord> = \{\};\n\s*if \(htiRaw\) data\['HTI'\] = JSON\.parse\(htiRaw\);\n\s*if \(citicRaw\) data\['CITIC_CAP'\] = JSON\.parse\(citicRaw\);\n\s*if \(ubsRaw\) data\['UBS'\] = JSON\.parse\(ubsRaw\);/,
  `const ubsRaw = localStorage.getItem(\`\${STORAGE_KEY_PREFIX}UBS\`);
      const ciccRaw = localStorage.getItem(\`\${STORAGE_KEY_PREFIX}CICC\`);
      const data: Record<string, QuoteRecord> = {};
      if (htiRaw) data['HTI'] = JSON.parse(htiRaw);
      if (citicRaw) data['CITIC_CAP'] = JSON.parse(citicRaw);
      if (ubsRaw) data['UBS'] = JSON.parse(ubsRaw);
      if (ciccRaw) data['CICC'] = JSON.parse(ciccRaw);`
);

// Fix UBS ticker parsing
code = code.replace(
  /if \(k\.includes\('代码'\) \|\| k === 'ticker' \|\| k === 'code' \|\| k === 'symbol'\) \{/,
  `if (k.includes('代码') || k === 'ticker' || k === 'code' || k === 'symbol' || k.includes('underlying') || k.includes('标的')) {`
);

// Update version string
code = code.replace(/v1\.0\.260304\.002/g, 'v1.0.260304.003');
fs.writeFileSync(file, code);
