const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/RFQPageEnhanced.tsx';
const code = fs.readFileSync(file, 'utf8');

// The crash usually happens in the onChange handler of the FormSearchSelect.
const match = code.match(/onChange=\{async ticker => \{[\s\S]*?\}\}/);
if (match) {
  console.log(match[0]);
} else {
  console.log("Could not find onChange handler for ticker");
}
