const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/RFQPageEnhanced.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Inject markup UI
const brokerDivRegex = /\{\/\* 第四行：上游券商选择 \*\/\}/;
const markupUI = `
          {/* 客户报价与点差设置 */}
          {Object.values(autoBrokerRates).length > 0 && Object.values(autoBrokerRates).some(r => r > 0) && (
            <div style={{ marginBottom: 20, padding: "16px", backgroundColor: "#fff8e1", borderRadius: 8, border: "1px solid #ffe082" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#f57c00", margin: 0 }}>⭐ 向客户报价设置</h3>
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 6 }}>系统最低费率</label>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#333" }}>
                    {(() => {
                      const validRates = Object.values(autoBrokerRates).filter(r => r > 0);
                      return validRates.length > 0 ? Math.min(...validRates).toFixed(2) + "%" : "--";
                    })()}
                  </div>
                </div>
                <div style={{ fontSize: 20, color: "#999", paddingTop: 18 }}>+</div>
                <div style={{ width: 120 }}>
                  <FormInput 
                    type="number" 
                    label="加点差 (%)" 
                    value={markupPercent} 
                    onChange={v => setMarkupPercent(parseFloat(v as string) || 0)} 
                  />
                </div>
                <div style={{ fontSize: 20, color: "#999", paddingTop: 18 }}>=</div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 6 }}>客户最终报价</label>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#d32f2f" }}>
                    {(() => {
                      const validRates = Object.values(autoBrokerRates).filter(r => r > 0);
                      const minRate = validRates.length > 0 ? Math.min(...validRates) : 0;
                      return (minRate + markupPercent).toFixed(2) + "%";
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 第四行：上游券商选择 */}`;
code = code.replace(brokerDivRegex, markupUI);

// 2. Fix the minRate wrap IIFE
// Search for: <div style={{ display: "flex", flexWrap: "wrap", gap: 12, minHeight: 120 }}>
const renderBrokersStartRegex = /<div style=\{\{ display: "flex", flexWrap: "wrap", gap: 12, minHeight: 120 \}\}>/;
const match = code.match(renderBrokersStartRegex);

if (match) {
  const minRateLogic = `
            {(() => {
              const validRates = Object.values(autoBrokerRates).filter(r => r > 0);
              const minRate = validRates.length > 0 ? Math.min(...validRates) : null;
              
              return (
                <>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, minHeight: 120 }}>
`;
  code = code.replace(match[0], minRateLogic);
  
  // Update Broker item styling
  code = code.replace(
    /backgroundColor: checked \? "#e8f2fc" : "white",/g,
    `backgroundColor: (checked && minRate !== null && autoBrokerRates[broker.id] === minRate) ? "#fff8e1" : (checked ? "#e8f2fc" : "white"),\n                    borderColor: (checked && minRate !== null && autoBrokerRates[broker.id] === minRate) ? "#ffb300" : "#d0d8e0",\n                    boxShadow: (checked && minRate !== null && autoBrokerRates[broker.id] === minRate) ? "0 0 0 1px #ffb300" : "none",`
  );

  // Close the IIFE at the end of the brokers list
  // The end is marked by </div>\n\n            {/* 调试信息面板 */}
  code = code.replace(
    /<\/div>\n\n            \{\/\* 调试信息面板 \*\/\}/g,
    `</div>\n                </>\n              );\n            })()}\n\n            {/* 调试信息面板 */}`
  );
} else {
  console.log("Could not find the broker wrapper!");
}

// Bump version
code = code.replace(/v1\.0\.260304\.003/g, 'v1.0.260304.004');
fs.writeFileSync(file, code);
