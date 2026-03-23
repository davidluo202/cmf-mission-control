const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/RFQPageEnhanced.tsx';
let code = fs.readFileSync(file, 'utf8');

// Update Brokers
code = code.replace(
  '{ id: 4, name: "东方国际 (OI)", email: "quote@orientalintl.com" },',
  `{ id: 4, name: "东方国际 (OI)", email: "quote@orientalintl.com" },
  { id: 5, name: "瑞银 (UBS HK)", email: "quote@ubs.com" },`
);

// We need a lookup function that checks all supported brokers.
// Instead of just HTI, we check HTI, CITIC, UBS.
const newLookup = `
const AUTO_QUOTE_BROKERS: Record<number, string> = {
  2: 'CITIC',
  3: 'HTI',
  5: 'UBS'
};

function lookupAllQuotes(ticker: string, tenorDays: number, strikePercent: number, optionType: string): Record<number, number> {
  const quotes: Record<number, number> = {};
  const tenor = TENOR_MAP[tenorDays] || TENOR_MAP[30];
  const direction = optionType === 'CALL' ? 'C' : 'P';
  const key = \`\${tenor}_\${strikePercent}\${direction}\`;

  for (const [brokerId, brokerCode] of Object.entries(AUTO_QUOTE_BROKERS)) {
    try {
      const raw = localStorage.getItem(\`broker_quotes_v2_\${brokerCode}\`);
      if (raw) {
        const record = JSON.parse(raw);
        const brokerQuotes = record.quotes || record;
        if (brokerQuotes[ticker] && brokerQuotes[ticker][key]) {
          quotes[Number(brokerId)] = brokerQuotes[ticker][key];
        }
      }
    } catch {}
  }
  return quotes;
}
`;

// Replace HTI_BROKER_ID to STRIKE_MAP block
code = code.replace(
  /const HTI_BROKER_ID = 3;\nconst TENOR_MAP: Record<number, string> = \{ 30: '1M', 60: '2M', 90: '3M' \};\nconst STRIKE_MAP: Record<number, number> = \{ 80: 80, 90: 90, 100: 100, 103: 103, 105: 105, 110: 110 \};/g,
  `const HTI_BROKER_ID = 3;
const TENOR_MAP: Record<number, string> = { 30: '1M', 60: '2M', 90: '3M', 180: '6M' };
const STRIKE_MAP: Record<number, number> = { 80: 80, 90: 90, 100: 100, 103: 103, 105: 105, 110: 110 };`
);

code = code.replace(
  /function lookupHtiQuote[\s\S]*?\} catch \{ return null; \}\n\}/,
  newLookup.trim()
);

// We need to keep NewRfqState and state variables. We should probably add `autoQuotes` to the state to allow manual edit,
// or we just maintain it in `CreateRfqModal`.

// First, inject autoQuotes into CreateRfqModal state:
// const [autoQuotes, setAutoQuotes] = useState<Record<number, number>>({});
code = code.replace(
  /const \[htiAutoQuote, setHtiAutoQuote\] = useState<number \| null>\(null\);\n  const \[htiAutoQuoteKey, setHtiAutoQuoteKey\] = useState<string>\(''\);/,
  `const [autoQuotes, setAutoQuotes] = useState<Record<number, number>>({});
  const [autoQuoteKey, setAutoQuoteKey] = useState<string>('');`
);

// Update useEffect in CreateRfqModal
code = code.replace(
  /useEffect\(\(\) => \{\n    if \(\(data\.brokerIds \|\| \[\]\)\.includes\(HTI_BROKER_ID\) && data\.underlyingTicker\) \{\n      const quote = lookupHtiQuote\(data\.underlyingTicker, data\.tenorDays, data\.strikePercent, data\.optionType\);\n      const tenor = TENOR_MAP\[data\.tenorDays\] \|\| \`\$\{data\.tenorDays\}d\`;\n      setHtiAutoQuote\(quote\);\n      setHtiAutoQuoteKey\(\`\$\{data\.underlyingTicker\} \| \$\{tenor\} \| \$\{data\.strikePercent\}% \| \$\{data\.optionType\}\`\);\n    \} else \{\n      setHtiAutoQuote\(null\);\n      setHtiAutoQuoteKey\(''\);\n    \}\n  \}, \[data\.brokerIds, data\.underlyingTicker, data\.tenorDays, data\.strikePercent, data\.optionType\]\);/,
  `useEffect(() => {
    if (data.underlyingTicker) {
      const quotes = lookupAllQuotes(data.underlyingTicker, data.tenorDays, data.strikePercent, data.optionType);
      const tenor = TENOR_MAP[data.tenorDays] || \`\${data.tenorDays}d\`;
      setAutoQuotes(prev => ({ ...prev, ...quotes }));
      setAutoQuoteKey(\`\${data.underlyingTicker} | \${tenor} | \${data.strikePercent}% | \${data.optionType}\`);
      
      // Auto-check the brokers that have quotes
      const newBrokerIds = new Set(data.brokerIds || []);
      let changed = false;
      for (const bId of Object.keys(quotes)) {
        if (!newBrokerIds.has(Number(bId))) {
          newBrokerIds.add(Number(bId));
          changed = true;
        }
      }
      if (changed) {
        onChange({ ...data, brokerIds: Array.from(newBrokerIds) });
      }
    } else {
      setAutoQuotes({});
      setAutoQuoteKey('');
    }
  }, [data.underlyingTicker, data.tenorDays, data.strikePercent, data.optionType]);`
);

// We need to pass the quotes when saving.
// Replace the handleCreate to use autoQuotes
code = code.replace(
  /const finalRfq: RFQ = \{\n\s+id: Date\.now\(\),\n\s+rfqCode: \`RFQ-\$\{new Date\(\)\.toISOString\(\)\.slice\(0, 10\)\.replace\(\/-\/g, ""\)\}-\$\{Math\.floor\(Math\.random\(\) \* 1000\)\}\`,\n\s+client: CLIENTS\.find\(c => c\.id === data\.clientId\)!,\n\s+underlying: \{\n\s+ticker: data\.underlyingTicker,\n\s+name: data\.underlyingName\n\s+\},\n\s+product: PRODUCTS\.find\(p => p\.id === data\.productId\)!,\n\s+optionType: data\.optionType,\n\s+buySell: data\.buySell,\n\s+strikePercent: data\.strikePercent,\n\s+tenorDays: data\.tenorDays,\n\s+notional: data\.notional,\n\s+currency: data\.currency,\n\s+currentPrice: data\.currentPrice,\n\s+status: "DRAFT",\n\s+brokers: \(data\.brokerIds \|\| \[\]\)\.map\(id => \{\n\s+const broker = BROKERS\.find\(b => b\.id === id\);\n\s+return \{\n\s+brokerId: id,\n\s+brokerName: broker\?\.name \|\| "",\n\s+rate: 0,\n\s+isSelected: false,\n\s+emailStatus: "pending" as const\n\s+\};\n\s+\}\),\n\s+createdAt: new Date\(\)\.toISOString\(\),\n\s+\};/,
  `const finalRfq: RFQ = {
      id: Date.now(),
      rfqCode: \`RFQ-\${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-\${Math.floor(Math.random() * 1000)}\`,
      client: CLIENTS.find(c => c.id === data.clientId)!,
      underlying: {
        ticker: data.underlyingTicker,
        name: data.underlyingName
      },
      product: PRODUCTS.find(p => p.id === data.productId)!,
      optionType: data.optionType,
      buySell: data.buySell,
      strikePercent: data.strikePercent,
      tenorDays: data.tenorDays,
      notional: data.notional,
      currency: data.currency,
      currentPrice: data.currentPrice,
      status: "DRAFT",
      brokers: (data.brokerIds || []).map(id => {
        const broker = BROKERS.find(b => b.id === id);
        const hasQuote = autoQuotes[id] !== undefined;
        return {
          brokerId: id,
          brokerName: broker?.name || "",
          rate: autoQuotes[id] || 0,
          isSelected: false,
          emailStatus: hasQuote ? ("none" as any) : "pending"
        };
      }),
      createdAt: new Date().toISOString(),
    };`
);

// We need to modify the UI to show the quotes per broker and allow manual editing
code = code.replace(
  /\{BROKERS\.map\(broker => \(\n\s+<label key=\{broker\.id\} style=\{\{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", border: "1px solid #d0d8e0", borderRadius: 6, cursor: "pointer", backgroundColor: \(data\.brokerIds \|\| \[\]\)\.includes\(broker\.id\) \? "#e8f2fc" : "white" \}\}>\n\s+<input \n\s+type="checkbox" \n\s+checked=\{\(data\.brokerIds \|\| \[\]\)\.includes\(broker\.id\)\}\n\s+onChange=\{e => \{\n\s+const current = data\.brokerIds \|\| \[\];\n\s+if \(e\.target\.checked\) \{\n\s+onChange\(\{ \.\.\.data, brokerIds: \[\.\.\.current, broker\.id\] \}\);\n\s+\} else \{\n\s+onChange\(\{ \.\.\.data, brokerIds: current\.filter\(id => id !== broker\.id\) \}\);\n\s+\}\n\s+\}\}\n\s+\/>\n\s+\{broker\.name\}\n\s+<\/label>\n\s+\)\)\}/,
  `{BROKERS.map(broker => {
                const isChecked = (data.brokerIds || []).includes(broker.id);
                const quoteVal = autoQuotes[broker.id];
                return (
                  <div key={broker.id} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 12px", border: "1px solid #d0d8e0", borderRadius: 6, backgroundColor: isChecked ? "#e8f2fc" : "white" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={e => {
                          const current = data.brokerIds || [];
                          if (e.target.checked) {
                            onChange({ ...data, brokerIds: [...current, broker.id] });
                          } else {
                            onChange({ ...data, brokerIds: current.filter(id => id !== broker.id) });
                          }
                        }}
                      />
                      {broker.name}
                    </label>
                    {isChecked && AUTO_QUOTE_BROKERS[broker.id] && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 22, fontSize: 12 }}>
                        <span style={{ color: '#666' }}>自动报价:</span>
                        <input 
                          type="number"
                          step="0.0001"
                          value={quoteVal ?? ''}
                          onChange={e => setAutoQuotes(prev => ({ ...prev, [broker.id]: parseFloat(e.target.value) || 0 }))}
                          style={{ width: 60, padding: "2px 4px", border: "1px solid #ccc", borderRadius: 4, fontSize: 12 }}
                        />
                        <span style={{ color: '#666' }}>%</span>
                      </div>
                    )}
                  </div>
                );
              })}`
);

// Remove the old HTI quote warning section
code = code.replace(
  /\{\(data\.brokerIds \|\| \[\]\)\.includes\(HTI_BROKER_ID\) && \(\n\s+<div style=\{\{ gridColumn: "1 \/ -1", padding: "10px 14px", backgroundColor: htiAutoQuote \!== null \? "#f0fdf4" : "#fef2f2", border: \`1px solid \$\{htiAutoQuote \!== null \? "#bbf7d0" : "#fecaca"\}\`, borderRadius: 6, fontSize: 13 \}\}>\n\s+<div style=\{\{ display: "flex", justifyContent: "space-between", alignItems: "center" \}\}>\n\s+<span style=\{\{ fontWeight: 600, color: htiAutoQuote \!== null \? "#166534" : "#991b1b" \}\}>\n\s+🔍 系统自动寻价检查 \(海通\)\n\s+<\/span>\n\s+<span style=\{\{ color: "#6a7a8a", fontSize: 12 \}\}>\{htiAutoQuoteKey\}<\/span>\n\s+<\/div>\n\s+<div style=\{\{ marginTop: 6, color: htiAutoQuote \!== null \? "#15803d" : "#b91c1c" \}\}>\n\s+\{htiAutoQuote \!== null \? \(\n\s+<>\n\s+✅ 找到匹配报价，提交后自动预填：<strong style=\{\{ fontSize: 15, marginLeft: 4 \}\}>\{\(htiAutoQuote \* 100\)\.toFixed\(2\)\}%<\/strong>\n\s+<\/>\n\s+\) : \(\n\s+<>\n\s+⚠️ 暂无匹配报价，请联系海通或手工录入。确保已先导入报价单（系统管理 → 券商报价导入）。\n\s+<\/>\n\s+\)\}\n\s+<\/div>\n\s+<\/div>\n\s+\)\}/,
  ``
);

code = code.replace(
  /<option value=\{90\}>3个月 \(3M\)<\/option>/,
  `<option value={90}>3个月 (3M)</option>\n                  <option value={180}>6个月 (6M)</option>`
);

fs.writeFileSync(file, code);
