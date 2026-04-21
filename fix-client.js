const fs = require('fs');
let importPage = fs.readFileSync('otc-trading-system/packages/client/src/pages/admin/BrokerQuoteImportPage.tsx', 'utf8');

// passing broker to API
importPage = importPage.replace('body: JSON.stringify({ rows: apiRows })', 'body: JSON.stringify({ broker, rows: apiRows })');
fs.writeFileSync('otc-trading-system/packages/client/src/pages/admin/BrokerQuoteImportPage.tsx', importPage);

let appPage = fs.readFileSync('otc-trading-system/packages/client/src/App.tsx', 'utf8');
let newAppPage = appPage.replace('const [isLoading, setIsLoading] = useState(false);', `const [isLoading, setIsLoading] = useState(true);

  // 初始化拉取全量最新报价
  useEffect(() => {
    fetch('/api/broker-quotes/latest')
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          const quotesByBroker: Record<string, Record<string, any>> = {};
          json.data.forEach((row: any) => {
             const b = row.broker;
             if (!b) return;
             if (!quotesByBroker[b]) quotesByBroker[b] = { broker: b, importedAt: new Date().toISOString(), importedBy: 'system', totalRows: 0, quotes: {} };
             quotesByBroker[b].quotes[row.ticker] = row;
          });
          
          for (const b of Object.keys(quotesByBroker)) {
             quotesByBroker[b].totalRows = Object.keys(quotesByBroker[b].quotes).length;
             import('lz-string').then(LZString => {
                localStorage.setItem('broker_quotes_v2_' + b, LZString.default.compressToUTF16(JSON.stringify(quotesByBroker[b])));
             });
          }
        }
      })
      .catch(err => console.error('Failed to preload DB quotes:', err))
      .finally(() => setIsLoading(false));
  }, []);
`);
fs.writeFileSync('otc-trading-system/packages/client/src/App.tsx', newAppPage);
