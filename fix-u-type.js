const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/RFQPageEnhanced.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace all back to "stock" first
code = code.replace(/type: u\.type \|\| "stock",/g, 'type: "stock",');

// Now carefully replace only the one inside loadOptionUnderlyings
// It looks like:
/*
        const result = stored
          .map((u: any) => ({
            ticker: u.ticker,
            name: u.name,
            type: "stock",
            currency: u.currency || "CNY",
            price: u.price || 0,
          }))
*/
code = code.replace(
  /type: "stock",\s*currency: u\.currency/g,
  'type: u.type || "stock",\n            currency: u.currency'
);

fs.writeFileSync(file, code);
