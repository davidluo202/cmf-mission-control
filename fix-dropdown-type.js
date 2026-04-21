const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/RFQPageEnhanced.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /type: "stock",/g,
  'type: u.type || "stock",'
);

code = code.replace(/v1\.0\.260303\.017/g, 'v1.0.260303.018');
fs.writeFileSync(file, code);
