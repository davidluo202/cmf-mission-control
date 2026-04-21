const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/RFQPageEnhanced.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace the broken IIFE pattern with a clean version
const brokenBlock = `            {(() => {
              const validRates = Object.values(autoBrokerRates).filter(r => r > 0);
              const minRate = validRates.length > 0 ? Math.min(...validRates) : null;
              
              return (
                <>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, minHeight: 120 }}>`;

const cleanBlock = `            {(() => {
              const validRates = Object.values(autoBrokerRates).filter(r => r > 0);
              const minRate = validRates.length > 0 ? Math.min(...validRates) : null;
              return (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, minHeight: 120 }}>`;

code = code.replace(brokenBlock, cleanBlock);

// Fix the closing - replace </div>\n            {data.underlyingTicker
const brokenEnd = `            </div>

            {data.underlyingTicker`;
const cleanEnd = `              </div>
            )}

            {data.underlyingTicker`;

code = code.replace(brokenEnd, cleanEnd);

// Also add the closing IIFE ) after the </div> of the flex container
// The flex div now closes at: <div style={{ flex: ... }}/>\n            </div>
const innerEnd = `              <div style={{ flex: '1 1 220px', minHeight: 1 }} />
            </div>`;
const fixedInnerEnd = `              <div style={{ flex: '1 1 220px', minHeight: 1 }} />
              </div>
              );
            })()}`;
code = code.replace(innerEnd, fixedInnerEnd);

// Also add "向客户报价" button in footer
const cancelBtn = `<button onClick={onCancel} style={{ padding: "10px 24px", backgroundColor: "#f5f5f5", color: "#666", border: "1px solid #d0d8e0", borderRadius: 6, fontSize: 14, cursor: "pointer" }}>取消</button>
            <button onClick={handleCreate} style={{ padding: "10px 24px", backgroundColor: "#1a6cb9", color: "white", border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer" }}>创建询价</button>`;
const newBtns = `<button onClick={onCancel} style={{ padding: "10px 24px", backgroundColor: "#f5f5f5", color: "#666", border: "1px solid #d0d8e0", borderRadius: 6, fontSize: 14, cursor: "pointer" }}>取消</button>
            {Object.values(autoBrokerRates).some(r => r > 0) ? (
              <button onClick={() => {
                const validRates = Object.values(autoBrokerRates).filter(r => r > 0);
                const minRate = validRates.length > 0 ? Math.min(...validRates) : 0;
                const clientRate = Number((minRate + markupPercent).toFixed(2));
                onChange({ ...dataRef.current, status: 'QUOTED', clientRate });
                onSave();
              }} style={{ padding: "10px 24px", backgroundColor: "#f57c00", color: "white", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                ⭐ 生成客户报价
              </button>
            ) : (
              <button onClick={handleCreate} style={{ padding: "10px 24px", backgroundColor: "#1a6cb9", color: "white", border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer" }}>创建询价</button>
            )}`;
code = code.replace(cancelBtn, newBtns);

// Add markupPercent state after strikePrice state if not exists
if (!code.includes('markupPercent')) {
  code = code.replace(
    'const [strikePrice, setStrikePrice] = useState<number|null>(null);',
    'const [strikePrice, setStrikePrice] = useState<number|null>(null);\n  const [markupPercent, setMarkupPercent] = useState<number>(1.00);'
  );
}

fs.writeFileSync(file, code);
console.log('Done');
