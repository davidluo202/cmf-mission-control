const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/RFQPageEnhanced.tsx';
let code = fs.readFileSync(file, 'utf8');

// Helper function to generate RFC code - add it near the top constants section
const rfqHelper = `
// 生成询价编号 RFQ-YYMMDD-SSS
function generateRfqCode(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePart = yy + mm + dd;
  
  // Sequence: read from localStorage
  const storageKey = 'rfq_seq_' + datePart;
  const cur = parseInt(localStorage.getItem(storageKey) || '0', 10);
  const next = cur + 1;
  localStorage.setItem(storageKey, String(next));
  return \`RFQ-\${datePart}-\${String(next).padStart(3, '0')}\`;
}
`;

code = code.replace(
  `const TENOR_MAP2: Record<number, string>`,
  rfqHelper + `const TENOR_MAP2: Record<number, string>`
);

// Fix single RFQ creation
code = code.replace(
  "rfqCode: `RFQ-${Date.now().toString(36).toUpperCase()}`,",
  "rfqCode: generateRfqCode(),"
);

// Fix batch RFQ creation
code = code.replace(
  "rfqCode: `RFQ-${Date.now().toString(36).toUpperCase().slice(-6)}-${item.id.toUpperCase()}`,",
  "rfqCode: generateRfqCode(),"
);

// Bump version
code = code.replace(/v1\.0\.260304\.009/g, 'v1.0.260304.010');
fs.writeFileSync(file, code);
console.log('Done');
