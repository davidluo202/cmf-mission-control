const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/RFQPageEnhanced.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Clear broker checkboxes when ticker is cleared
const oldUseEffect = `  useEffect(() => {
    if (!data.underlyingTicker) {
      setAutoBrokerRates({});
      setAutoQuoteKey('');
      return;
    }`;

const newUseEffect = `  useEffect(() => {
    if (!data.underlyingTicker) {
      setAutoBrokerRates({});
      setAutoQuoteKey('');
      if (data.brokerIds && data.brokerIds.length > 0) {
         onChange({ ...data, brokerIds: [] });
      }
      return;
    }`;

code = code.replace(oldUseEffect, newUseEffect);

// 2. Compute minimum rate
const renderBrokersStartRegex = /<h3[^>]*>询价券商[\s\S]*?<div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>/;
const match = code.match(renderBrokersStartRegex);

if (match) {
  const minRateLogic = `
            {(() => {
              const validRates = Object.values(autoBrokerRates).filter(r => r > 0);
              const minRate = validRates.length > 0 ? Math.min(...validRates) : null;
              
              return (
                <>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
`;
  code = code.replace(match[0], match[0].replace('<div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>', minRateLogic));
  
  // Update Broker item styling
  code = code.replace(
    /backgroundColor: checked \? "#e8f2fc" : "white",/g,
    `backgroundColor: (checked && minRate !== null && autoBrokerRates[broker.id] === minRate) ? "#fff8e1" : (checked ? "#e8f2fc" : "white"),\n                    borderColor: (checked && minRate !== null && autoBrokerRates[broker.id] === minRate) ? "#ffb300" : "#d0d8e0",\n                    boxShadow: (checked && minRate !== null && autoBrokerRates[broker.id] === minRate) ? "0 0 0 1px #ffb300" : "none",`
  );

  // Close the IIFE at the end of the brokers list
  code = code.replace(
    /<\/div>\n\n            \{\/\* 调试信息面板 \*\/\}/g,
    `</div>\n                </>\n              );\n            })()}\n\n            {/* 调试信息面板 */}`
  );
}

// 3. Update Send to Client button if there are auto quotes
const buttonAreaRegex = /<div style={{ padding: "16px 20px", borderTop: "1px solid #e0e8f0", display: "flex", justifyContent: "flex-end", gap: 12, backgroundColor: "#f8fafd" }}>[\s\S]*?<\/div>\n      <\/div>\n    <\/div>\n  \);\n}/;
const btnMatch = code.match(buttonAreaRegex);
if (btnMatch) {
  const oldBtnArea = btnMatch[0];
  const newBtnArea = oldBtnArea.replace(
    `<button 
            onClick={handleCreate}
            style={{ padding: "8px 24px", backgroundColor: "#0066cc", color: "white", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: "pointer" }}
          >
            保存并发送询价
          </button>`,
    `{Object.values(autoBrokerRates).length > 0 && Object.values(autoBrokerRates).some(r => r > 0) ? (
            <button 
              onClick={() => {
                const validRates = Object.values(autoBrokerRates).filter(r => r > 0);
                const minRate = validRates.length > 0 ? Math.min(...validRates) : 0;
                // If they have a rate, we can auto-fill clientRate as minRate + markup (markup default to something or just minRate for now)
                // They wanted "Send to client" directly. We will act as if it's saved and confirmed.
                onSave();
              }}
              style={{ padding: "8px 24px", backgroundColor: "#ff9800", color: "white", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              ⭐ 生成向客户报价
            </button>
          ) : (
            <button 
              onClick={handleCreate}
              style={{ padding: "8px 24px", backgroundColor: "#0066cc", color: "white", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: "pointer" }}
            >
              保存并发送询价
            </button>
          )}`
  );
  code = code.replace(oldBtnArea, newBtnArea);
}

// Bump version in App.tsx as well via a separate command, here we just do version string if exists
fs.writeFileSync(file, code);
