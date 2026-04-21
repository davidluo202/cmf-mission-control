const fs = require('fs');
let appPage = fs.readFileSync('otc-trading-system/packages/client/src/App.tsx', 'utf8');

const target = `  const [isMobile, setIsMobile] = useState(false);`;
const insert = `  const [isMobile, setIsMobile] = useState(false);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true);

  // 初始化拉取全量最新报价
  useEffect(() => {
    fetch('/api/broker-quotes/latest')
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          const quotesByBroker = {};
          json.data.forEach((row) => {
             const b = row.broker || 'HTI';
             if (!quotesByBroker[b]) quotesByBroker[b] = { broker: b, importedAt: new Date().toISOString(), importedBy: 'system', totalRows: 0, quotes: {} };
             quotesByBroker[b].quotes[row.ticker] = row;
          });
          
          import('lz-string').then(LZString => {
            for (const b of Object.keys(quotesByBroker)) {
               quotesByBroker[b].totalRows = Object.keys(quotesByBroker[b].quotes).length;
               localStorage.setItem('broker_quotes_v2_' + b, LZString.default.compressToUTF16(JSON.stringify(quotesByBroker[b])));
            }
          });
        }
      })
      .catch(err => console.error('Failed to preload DB quotes:', err))
      .finally(() => setIsLoadingQuotes(false));
  }, []);`;

appPage = appPage.replace(target, insert);

// Bump version
appPage = appPage.replace('v1.0.260305.011', 'v1.0.260305.012');
fs.writeFileSync('otc-trading-system/packages/client/src/App.tsx', appPage);

let importPage = fs.readFileSync('otc-trading-system/packages/client/src/pages/admin/BrokerQuoteImportPage.tsx', 'utf8');
importPage = importPage.replace('v1.0.260305.011', 'v1.0.260305.012');
fs.writeFileSync('otc-trading-system/packages/client/src/pages/admin/BrokerQuoteImportPage.tsx', importPage);
