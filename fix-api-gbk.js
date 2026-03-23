const fs = require('fs');
const file = 'otc-trading-system/api/market/quote.js';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /const text = await r\.text\(\);/,
  `const buffer = await r.arrayBuffer();
    const decoder = new TextDecoder('gbk');
    const text = decoder.decode(buffer);`
);
fs.writeFileSync(file, code);
