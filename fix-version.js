const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/admin/BrokerQuoteImportPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// replace v1.2.2 with v1.0.260303.001
code = code.replace(/v1\.2\.2/g, 'v1.0.260303.001');

fs.writeFileSync(file, code);
