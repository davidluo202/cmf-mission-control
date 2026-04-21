const fs = require('fs');
const code = fs.readFileSync('otc-trading-system/packages/client/src/pages/RFQPageEnhanced.tsx', 'utf8');

const match = code.match(/<div style={{ padding: "12px"[\s\S]*?<\/div>\n              <\/div>/);
if (match) console.log(match[0]);
