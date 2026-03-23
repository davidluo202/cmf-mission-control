const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/RFQPageEnhanced.tsx';
let code = fs.readFileSync(file, 'utf8');

// Fix situation B button - better description + also show min rate info
code = code.replace(
  `              } else if (hasAnyAutoRate && manualBrokers.length > 0) {
                // Mix of auto + manual -> save as pending_quote with email needed
                return (
                  <button onClick={() => {
                    onChange({ ...dataRef.current, status: 'pending_quote' });
                    setTimeout(() => onSave(), 0);
                  }} style={{ padding: "10px 24px", backgroundColor: "#7c3aed", color: "white", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                    📨 保存并发券商询价邮件
                  </button>
                );`,
  `              } else if (hasAnyAutoRate && manualBrokers.length > 0) {
                // Mix of auto + manual -> save as pending_quote, emails only to manual brokers
                const validRates = Object.values(autoBrokerRates).filter(r => r > 0);
                const minAutoRate = validRates.length > 0 ? Math.min(...validRates) : 0;
                const manualBrokerNames = manualBrokers.map(id => BROKERS.find(b => b.id === id)?.name || id).join('、');
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'right' }}>
                      ✅ 已有自动报价：最低 <strong>{minAutoRate.toFixed(2)}%</strong><br />
                      📨 将向以下券商发询价邮件：<strong>{manualBrokerNames}</strong>
                    </div>
                    <button onClick={() => {
                      onChange({ ...dataRef.current, status: 'pending_quote' });
                      setTimeout(() => onSave(), 0);
                    }} style={{ padding: "10px 24px", backgroundColor: "#7c3aed", color: "white", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                      📨 保存并向无报价券商发询价
                    </button>
                  </div>
                );`
);

// Also clarify situation A button
code = code.replace(
  `                  <button onClick={() => {
                    const validRates = Object.values(autoBrokerRates).filter(r => r > 0);
                    const minRate = validRates.length > 0 ? Math.min(...validRates) : 0;
                    const clientRate = Number((minRate + markupPercent).toFixed(2));
                    onChange({ ...dataRef.current, clientRate, status: 'pending_confirm' });
                    setTimeout(() => onSave(), 0);
                  }} style={{ padding: "10px 24px", backgroundColor: "#f57c00", color: "white", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                    ⭐ 生成客户报价
                  </button>`,
  `                  <button onClick={() => {
                    const validRates = Object.values(autoBrokerRates).filter(r => r > 0);
                    const minRate = validRates.length > 0 ? Math.min(...validRates) : 0;
                    const clientRate = Number((minRate + markupPercent).toFixed(2));
                    onChange({ ...dataRef.current, clientRate, status: 'pending_confirm' });
                    setTimeout(() => onSave(), 0);
                  }} style={{ padding: "10px 24px", backgroundColor: "#f57c00", color: "white", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                    ⭐ 直接生成客户报价（无需询价）
                  </button>`
);

// Bump version
code = code.replace(/v1\.0\.260304\.008/g, 'v1.0.260304.009');
fs.writeFileSync(file, code);
console.log('Done');
