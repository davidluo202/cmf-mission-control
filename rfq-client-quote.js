const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/RFQPageEnhanced.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add states for client quote modal
const stateRegex = /const \[showCreateModal, setShowCreateModal\] = useState\(false\);/;
code = code.replace(stateRegex, `const [showCreateModal, setShowCreateModal] = useState(false);\n  const [showQuoteModal, setShowQuoteModal] = useState(false);\n  const [currentRfqForQuote, setCurrentRfqForQuote] = useState<RFQ | null>(null);`);

// 2. We need to define markup state in CreateRfqModal or RFQPageEnhanced
// But wait, the flow is: 
// Click "⭐ 生成向客户报价" -> creates RFQ -> shows Client Quote Modal
// Or we can add markup in CreateRfqModal itself.

// Let's add markup input to CreateRfqModal.
const markupStateRegex = /const \[strikePrice, setStrikePrice\] = useState<number\|null>\(null\);/;
code = code.replace(markupStateRegex, `const [strikePrice, setStrikePrice] = useState<number|null>(null);\n  const [markupPercent, setMarkupPercent] = useState<number>(1.00); // 默认加点差1%`);

// Add UI for Markup
const brokerDivRegex = /\{\/\* 询价券商勾选区 \*\/\}/;
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

          {/* 询价券商勾选区 */}`;
code = code.replace(brokerDivRegex, markupUI);

// Update Save button logic
const saveLogicRegex = /const validRates = Object.values\(autoBrokerRates\).filter\(r => r > 0\);\n\s*const minRate = validRates.length > 0 \? Math.min\(\.\.\.validRates\) : 0;\n\s*\/\/ If they have a rate, we can auto-fill clientRate as minRate \+ markup \(markup default to something or just minRate for now\)\n\s*\/\/ They wanted "Send to client" directly. We will act as if it's saved and confirmed.\n\s*onSave\(\);/;

const newSaveLogic = `const validRates = Object.values(autoBrokerRates).filter(r => r > 0);
                const minRate = validRates.length > 0 ? Math.min(...validRates) : 0;
                const clientRate = Number((minRate + markupPercent).toFixed(2));
                onChange({ ...data, status: 'QUOTED', clientRate }); // Set status to QUOTED so we can trigger the Quote Modal
                onSave();`;

code = code.replace(saveLogicRegex, newSaveLogic);

// Add Client Quote Modal component
// We need a place for this inside RFQPageEnhanced
// I'll append it before `function RFQPageEnhanced() {` or after MOCK_RFQS

const quoteModalComponent = `
function ClientQuoteModal({ rfq, onClose }: { rfq: RFQ, onClose: () => void }) {
  const isCall = rfq.product.optionType === "CALL";
  const directionStr = isCall ? "看涨" : "看跌";
  const premium = rfq.clientRate ? (rfq.notional * rfq.clientRate / 100) : 0;
  
  const template = \`【期权报价单】
您好！针对您询价的场外期权，报价如下：

标的名称：\${rfq.underlying.name} (\${rfq.underlying.ticker})
期权类型：香草\${directionStr}期权
行权价：\${rfq.product.strikePercent}% (估算 \${rfq.product.strikePrice?.toFixed(2)} \${rfq.underlying.currency || 'CNY'})
名义本金：\${rfq.notional} 万元
期限：\${rfq.product.tenor}
====================
最终报价（期权费率）：\${rfq.clientRate?.toFixed(2)}%
预估权利金总额：\${premium.toFixed(2)} 万元

⚠️【交易须知】
如您接受此报价，请确认并按照上述预估权利金金额及约定的付款日期，将资金支付至我方指定账户。
待资金到账且我方发出正式确认单后，该笔交易方可生效。

请回复是否确认交易。谢谢！\`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(template);
    alert("报价内容已复制，可直接粘贴到微信或邮件中发送给客户！");
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 600, backgroundColor: "white", borderRadius: 12, display: "flex", flexDirection: "column", maxHeight: "90vh", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e0e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 18, margin: 0, color: "#1a2a3a" }}>向客户发送报价 (微信/邮件)</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#666" }}>×</button>
        </div>
        <div style={{ padding: "20px", overflow: "auto" }}>
          <p style={{ fontSize: 14, color: "#666", marginBottom: 12 }}>以下是系统为您自动生成的报价模板，您可以直接复制发给客户：</p>
          <textarea 
            readOnly 
            value={template} 
            style={{ width: "100%", height: 300, padding: 12, borderRadius: 6, border: "1px solid #d0d8e0", fontSize: 14, lineHeight: 1.6, backgroundColor: "#f8fafd", fontFamily: "monospace", resize: "none" }}
          />
        </div>
        <div style={{ padding: "16px 20px", borderTop: "1px solid #e0e8f0", display: "flex", justifyContent: "flex-end", gap: 12, backgroundColor: "#f8fafd" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", backgroundColor: "white", border: "1px solid #d0d8e0", borderRadius: 6, fontSize: 14, cursor: "pointer" }}>关闭</button>
          <button onClick={copyToClipboard} style={{ padding: "8px 24px", backgroundColor: "#07c160", color: "white", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16 }}>📋</span> 一键复制内容
          </button>
        </div>
      </div>
    </div>
  );
}
`;

code = code.replace(/export default function RFQPageEnhanced/, quoteModalComponent + '\nexport default function RFQPageEnhanced');

// Show the modal after save
const onSaveRegex = /const handleSave = \(\) => \{\n\s*if \(editingId === null\) \{/;
const newHandleSave = `const handleSave = () => {
    if (editingId === null) {
      const newId = Math.max(...rfqs.map(r => r.id), 0) + 1;
      const rfqCode = \`RFQ-\${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-\${String(newId).padStart(3, '0')}\`;
      const newRfq: RFQ = {
        id: newId,
        rfqCode,
        client: CLIENTS.find(c => c.id === formData.clientId) || CLIENTS[0],
        underlying: { ticker: formData.underlyingTicker || '', name: formData.underlyingName || '' },
        product: {
          optionType: formData.optionType as any || 'CALL',
          strikePercent: formData.strikePercent || 100,
          strikePrice: formData.strikePrice || undefined,
          tenor: TENOR_MAP[formData.tenorDays || 30] || \`\${formData.tenorDays}d\`
        },
        notional: formData.notional || 1000,
        status: formData.status || 'PENDING_BROKER',
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        clientRate: formData.clientRate,
      };
      setRfqs([newRfq, ...rfqs]);
      setShowCreateModal(false);
      
      // If status is QUOTED, it means we generated a client quote automatically
      if (formData.status === 'QUOTED') {
         setCurrentRfqForQuote(newRfq);
         setShowQuoteModal(true);
      }
    } else {
      setRfqs(rfqs.map(r => r.id === editingId ? { ...r, clientRate: formData.clientRate, status: formData.status || r.status } : r));
      setShowCreateModal(false);
      
      if (formData.status === 'QUOTED') {
         const updatedRfq = { ...rfqs.find(r => r.id === editingId)!, clientRate: formData.clientRate, status: formData.status };
         setCurrentRfqForQuote(updatedRfq);
         setShowQuoteModal(true);
      }
    }`;

code = code.replace(/const handleSave = \(\) => \{\n\s*if \(editingId === null\) \{\n\s*const newId = [^]*?\}\n\s*\};/, newHandleSave + "\n  };\n");

// Include the modal rendering
const pageRenderEndRegex = /<\/div>\n  \);\n}/;
code = code.replace(pageRenderEndRegex, `      {showQuoteModal && currentRfqForQuote && (
        <ClientQuoteModal rfq={currentRfqForQuote} onClose={() => setShowQuoteModal(false)} />
      )}
    </div>
  );
}`);

// Add TS property for clientRate to Partial<RFQData>
code = code.replace(
  /status\?: string;/g,
  `status?: string;\n  clientRate?: number;`
);

// Bump version in App.tsx -> doing via edit

fs.writeFileSync(file, code);
