const fs = require('fs');
const code = fs.readFileSync('otc-trading-system/packages/client/src/pages/RFQPageEnhanced.tsx', 'utf8');

const match = code.match(/useEffect\(\(\) => \{[\s\S]*?lookupAllQuotes[\s\S]*?\}, \[data.underlyingTicker.*?\]\);/);
if (match) console.log(match[0]);
else {
  const match2 = code.match(/useEffect\(\(\) => \{[\s\S]*?setStrikePrice/);
  if (match2) console.log(match2[0]);
}

