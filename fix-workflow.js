const fs = require('fs');
const path = 'otc-trading-system/packages/client/src/pages/RFQPageEnhanced.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add tradeCode to RFQ type
content = content.replace('status: "draft" | "pending_quote" | "pending_confirm" | "client_confirmed" | "traded" | "rejected" | "done";\n  clientRate?: number;', 'status: "draft" | "pending_quote" | "pending_confirm" | "client_confirmed" | "traded" | "rejected" | "done";\n  tradeCode?: string;\n  clientRate?: number;');

// 2. Add state for BrokerConfirmModal
const stateHookTarget = 'const [showClientQuoteModal, setShowClientQuoteModal] = useState(false);';
const stateHookInsert = `const [showClientQuoteModal, setShowClientQuoteModal] = useState(false);
  const [showBrokerConfirmModal, setShowBrokerConfirmModal] = useState(false);
  const [pendingBrokerConfirmRfq, setPendingBrokerConfirmRfq] = useState<RFQ | null>(null);`;
content = content.replace(stateHookTarget, stateHookInsert);

// 3. Update handleClientConfirm to show modal instead of alert
const handleClientConfirmOld = `  const handleClientConfirm = (rfq: RFQ) => {
    // Mark as client_confirmed - pending broker confirmation
    const updated = rfqs.map(r => r.id === rfq.id ? { ...r, status: 'client_confirmed' as const } : r);
    saveRfqsToStorage(updated);
    setRfqs(updated);
    alert(\`✅ 已记录客户确认！\\n\\n请联系中标券商确认成交，确认后点击"券商确认成交"按钮。\`);
  };`;

const handleClientConfirmNew = `  const handleClientConfirm = (rfq: RFQ) => {
    setPendingBrokerConfirmRfq(rfq);
    setShowBrokerConfirmModal(true);
  };`;
content = content.replace(handleClientConfirmOld, handleClientConfirmNew);

// 4. Update handleBrokerConfirm to generate tradeCode
const handleBrokerConfirmOld = `  const handleBrokerConfirm = (rfq: RFQ) => {
    if (!confirm('确认券商已确认成交？该记录将进入已成交状态并加入总台账。')) return;
    const updated = rfqs.map(r => r.id === rfq.id ? { ...r, status: 'traded' as const } : r);
    saveRfqsToStorage(updated);
    setRfqs(updated);
  };`;

const handleBrokerConfirmNew = `  const handleBrokerConfirm = (rfq: RFQ) => {
    if (!confirm('确认券商已确认成交？该记录将进入已成交状态并自动生成交易记录（TRD编号）。')) return;
    const tradeCode = generateTradeCode();
    const updated = rfqs.map(r => r.id === rfq.id ? { ...r, status: 'traded' as const, tradeCode } : r);
    saveRfqsToStorage(updated);
    setRfqs(updated);
    alert(\`✅ 已成交并生成交易记录：\${tradeCode}，已存入交易台账。\`);
  };`;
content = content.replace(handleBrokerConfirmOld, handleBrokerConfirmNew);

// 5. Add BrokerConfirmModal component
const modalTarget = '{showClientQuoteModal && pendingQuoteRfq && (';
const brokerConfirmModalCode = `{showBrokerConfirmModal && pendingBrokerConfirmRfq && (
        <BrokerConfirmModal rfq={pendingBrokerConfirmRfq} onClose={() => setShowBrokerConfirmModal(false)} onSent={() => {
          const updated = rfqs.map(r => r.id === pendingBrokerConfirmRfq.id ? { ...r, status: 'client_confirmed' as const } : r);
          saveRfqsToStorage(updated);
          setRfqs(updated);
          setShowBrokerConfirmModal(false);
          alert("✅ 已向中标券商发送成交确认邮件，等待券商答复。\\n收到答复后，请点击“券商确认成交”。");
        }} />
      )}
      
      {showClientQuoteModal && pendingQuoteRfq && (`;
content = content.replace(modalTarget, brokerConfirmModalCode);

// 6. Fix the UnderlyingType preservation issue
const underlyingTypeIssueOld = `                    if (stock) {
                      onChange({
                        ...dataRef.current,
                        underlyingTicker: ticker,
                        underlyingName: stock.name,
                        underlyingType: stock.type,
                      });`;

const underlyingTypeIssueNew = `                    if (stock) {
                      onChange({
                        ...dataRef.current,
                        underlyingTicker: ticker,
                        underlyingName: stock.name,
                        underlyingType: dataRef.current.underlyingType === 'etf' ? 'etf' : stock.type,
                      });`;
content = content.replace(underlyingTypeIssueOld, underlyingTypeIssueNew);

const underlyingTypeIssueApiOld = `                      // 更新名称、价格
                      onChange({
                        ...dataRef.current,
                        underlyingTicker: ticker,
                        underlyingName: q.name || stock?.name || '',
                        currentPrice: q.price,
                        currency: q.currency || stock?.currency || 'CNY',
                        underlyingType: stock?.type || 'stock',
                      });`;

const underlyingTypeIssueApiNew = `                      // 更新名称、价格
                      onChange({
                        ...dataRef.current,
                        underlyingTicker: ticker,
                        underlyingName: q.name || stock?.name || '',
                        currentPrice: q.price,
                        currency: q.currency || stock?.currency || 'CNY',
                        underlyingType: dataRef.current.underlyingType === 'etf' ? 'etf' : (stock?.type || 'stock'),
                      });`;
content = content.replace(underlyingTypeIssueApiOld, underlyingTypeIssueApiNew);


// 7. Add BrokerConfirmModal definition at the end
const brokerConfirmDef = `
function BrokerConfirmModal({ rfq, onClose, onSent }: { rfq: RFQ; onClose: () => void; onSent: () => void }) {
  const [content, setContent] = useState('');
  
  useEffect(() => {
    // 找出中标券商
    const winner = rfq.brokerQuotes?.find(q => q.id === rfq.winnerBrokerId || q.isSelected);
    const brokerName = winner?.brokerName || '上游券商';
    const rate = winner?.rate || 0;
    
    setContent(\`\${brokerName} 交易台，\\n\\n请确认以下期权交易：\\n\\n交易标的: \${rfq.underlying.name} (\${rfq.underlying.ticker})\\n方向: \${rfq.buySell === 'BUY' ? '买入' : '卖出'} \${rfq.optionType === 'CALL' ? '看涨' : '看跌'}\\n名义本金: \${rfq.notional.toLocaleString()} \${rfq.currency || 'CNY'}\\n期限: \${rfq.tenorDays}天 (到期日: \${rfq.expiryDate})\\n行权比例: \${rfq.strikePercent}%\\n\\n中标费率: \${rate.toFixed(2)}%\\n\\n请回复确认成交，谢谢！\`);
  }, [rfq]);

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ backgroundColor: "white", padding: 24, borderRadius: 8, width: 500, maxWidth: "90%" }}>
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>发送券商成交确认 (RFQ: {rfq.rfqCode})</h3>
        <textarea
          style={{ width: "100%", height: 200, padding: 8, border: "1px solid #d1d5db", borderRadius: 4, fontFamily: "monospace", fontSize: 13 }}
          value={content}
          onChange={e => setContent(e.target.value)}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", backgroundColor: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer" }}>取消</button>
          <button onClick={onSent} style={{ padding: "8px 16px", backgroundColor: "#0369a1", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>发送邮件并等待答复</button>
        </div>
      </div>
    </div>
  );
}
`;
content += brokerConfirmDef;

fs.writeFileSync(path, content);
console.log('Script executed');
