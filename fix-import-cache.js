const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/admin/BrokerQuoteImportPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// The logic previously:
// } else if (importedName) {
//   const existing = underlyingsMap.get(ticker);
//   if (!existing.name || existing.name === '') { ... }
// }
// Let's replace it so it ALWAYS overwrites if importedName is valid, OR at least let's add a "Clear Cache" button, but auto-overwrite is better.

const oldExtract = `          } else if (importedName) {
            const existing = underlyingsMap.get(ticker);
            if (!existing.name || existing.name === '') {
               existing.name = importedName;
               existing.type = importedType;
               underlyingsMap.set(ticker, existing);
            }
          }`;

const newExtract = `          } else if (importedName) {
            const existing = underlyingsMap.get(ticker);
            // Always update to the latest imported name to fix garbled names
            // Always update type in case it was imported as stock but should be etf
            existing.name = importedName;
            existing.type = importedType;
            underlyingsMap.set(ticker, existing);
          }`;

code = code.replace(oldExtract, newExtract);

// Bump version
code = code.replace(/v1\.0\.260303\.016/g, 'v1.0.260303.017');
fs.writeFileSync(file, code);
