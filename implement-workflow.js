const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/RFQPageEnhanced.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Update RFQ type to add new statuses + clientRate + winnerBrokerId
code = code.replace(
  `  status: "draft" | "pending_quote" | "pending_confirm" | "done";`,
  `  status: "draft" | "pending_quote" | "pending_confirm" | "client_confirmed" | "traded" | "rejected" | "done";
  clientRate?: number;
  winnerBrokerId?: number;`
);

// 2. Update status dropdown options
code = code.replace(
  `          <option value="draft">草稿</option>
          <option value="pending_quote">待报价</option>
          <option value="pending_confirm">待确认</option>
          <option value="done">已完成</option>`,
  `          <option value="draft">草稿</option>
          <option value="pending_quote">待上游报价</option>
          <option value="pending_confirm">报价待客户确认</option>
          <option value="client_confirmed">客户已确认</option>
          <option value="traded">已成交</option>
          <option value="rejected">已拒绝</option>
          <option value="done">已完成</option>`
);

// 3. Update status badge renderer
code = code.replace(
  `{rfq.status === "draft" ? "草稿" : rfq.status === "pending_quote" ? "待报价" : rfq.status === "pending_confirm" ? "待确认" : "已完成"}`,
  `{rfq.status === "draft" ? "草稿" : rfq.status === "pending_quote" ? "📨 待上游报价" : rfq.status === "pending_confirm" ? "⏳ 待客户确认" : rfq.status === "client_confirmed" ? "✅ 客户已确认" : rfq.status === "traded" ? "🤝 已成交" : rfq.status === "rejected" ? "❌ 已拒绝" : "完成"}`
);

// 4. Update status badge background color
code = code.replace(
  `backgroundColor: rfq.status === "done" ? "#e8f5e9" : rfq.status === "pending_confirm" ? "#fff3e0" : "#f5f5f5", color: rfq.status === "done" ? "#22c55e" : rfq.status === "pending_confirm" ? "#f59e0b" : "#666"`,
  `backgroundColor: rfq.status === "traded" ? "#e8f5e9" : rfq.status === "client_confirmed" ? "#e0f2fe" : rfq.status === "pending_confirm" ? "#fff3e0" : rfq.status === "rejected" ? "#fee2e2" : rfq.status === "pending_quote" ? "#ede9fe" : "#f5f5f5",
                      color: rfq.status === "traded" ? "#16a34a" : rfq.status === "client_confirmed" ? "#0369a1" : rfq.status === "pending_confirm" ? "#f59e0b" : rfq.status === "rejected" ? "#dc2626" : rfq.status === "pending_quote" ? "#7c3aed" : "#666"`
);

// 5. Update action buttons in list to include status transitions
const oldActionBtns = `                    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                      <button onClick={() => openDetail(rfq)} style={{ padding: "6px 12px", backgroundColor: "white", color: "#1a6cb9", border: "1px solid #1a6cb9", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>
                        {rfq.status === "draft" ? "编辑" : "查看"}
                      </button>
                      {rfq.brokerQuotes && rfq.brokerQuotes.length > 0 && (
                        <button onClick={() => openEmailQueueMode(rfq)} style={{ padding: "6px 12px", backgroundColor: pending > 0 ? "#22c55e" : "#6b7280", color: "white", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>
                          邮件 {pending > 0 ? \`(\${pending})\` : ""}
                        </button>
                      )}
                    </div>`;

const newActionBtns = `                    <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                      <button onClick={() => openDetail(rfq)} style={{ padding: "6px 10px", backgroundColor: "white", color: "#1a6cb9", border: "1px solid #1a6cb9", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>
                        {rfq.status === "draft" || rfq.status === "pending_quote" ? "编辑" : "查看"}
                      </button>
                      {rfq.brokerQuotes && rfq.brokerQuotes.length > 0 && pending > 0 && (
                        <button onClick={() => openEmailQueueMode(rfq)} style={{ padding: "6px 10px", backgroundColor: "#7c3aed", color: "white", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>
                          📨 发询价({pending})
                        </button>
                      )}
                      {rfq.status === "pending_confirm" && (
                        <>
                          <button onClick={() => handleClientConfirm(rfq)} style={{ padding: "6px 10px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>✅ 客户确认</button>
                          <button onClick={() => handleClientReject(rfq)} style={{ padding: "6px 10px", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>❌ 拒绝</button>
                        </>
                      )}
                      {rfq.status === "client_confirmed" && (
                        <button onClick={() => handleBrokerConfirm(rfq)} style={{ padding: "6px 10px", backgroundColor: "#0369a1", color: "white", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>🤝 券商确认成交</button>
                      )}
                    </div>`;

code = code.replace(oldActionBtns, newActionBtns);

// 6. Add transition handler functions (after openEmailQueueMode)
const handlersInsertPoint = `  const openDetail = (rfq: RFQ) => {`;
const newHandlers = `  const handleClientConfirm = (rfq: RFQ) => {
    // Mark as client_confirmed - pending broker confirmation
    const updated = rfqs.map(r => r.id === rfq.id ? { ...r, status: 'client_confirmed' as const } : r);
    saveRfqsToStorage(updated);
    setRfqs(updated);
    alert(\`✅ 已记录客户确认！\\n\\n请联系中标券商确认成交，确认后点击"券商确认成交"按钮。\`);
  };

  const handleClientReject = (rfq: RFQ) => {
    if (!confirm('确认客户拒绝此报价？')) return;
    const updated = rfqs.map(r => r.id === rfq.id ? { ...r, status: 'rejected' as const } : r);
    saveRfqsToStorage(updated);
    setRfqs(updated);
  };

  const handleBrokerConfirm = (rfq: RFQ) => {
    if (!confirm('确认券商已确认成交？该记录将进入已成交状态并加入总台账。')) return;
    const updated = rfqs.map(r => r.id === rfq.id ? { ...r, status: 'traded' as const } : r);
    saveRfqsToStorage(updated);
    setRfqs(updated);
    alert(\`🎉 交易确认成功！已加入总台账。\\n编号: \${rfq.rfqCode}\`);
  };

  const openDetail = (rfq: RFQ) => {`;

code = code.replace(handlersInsertPoint, newHandlers);

// 7. Update handleCreateRfq to use new statuses
code = code.replace(
  `      status: "draft",`,
  `      status: (finalRfq.brokerIds || []).some(id => {
        const autoRate = lookupBrokerQuote(id, finalRfq.underlyingTicker, finalRfq.tenorDays, finalRfq.strikePercent, finalRfq.optionType);
        return autoRate === null;
      }) ? "pending_quote" as const : "draft" as const,`
);

// 8. In CreateRfqModal, update the "⭐ 生成客户报价" button to check for manual brokers
// Replace the button logic
code = code.replace(
  `{Object.values(autoBrokerRates).some(r => r > 0) ? (
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
            )}`,
  `{(() => {
              const hasAnyAutoRate = Object.values(autoBrokerRates).some(r => r > 0);
              const manualBrokers = (data.brokerIds || []).filter(id => !autoBrokerRates[id] || autoBrokerRates[id] <= 0);
              
              if (hasAnyAutoRate && manualBrokers.length === 0) {
                // All brokers have auto rates -> show client quote button
                return (
                  <button onClick={() => {
                    const validRates = Object.values(autoBrokerRates).filter(r => r > 0);
                    const minRate = validRates.length > 0 ? Math.min(...validRates) : 0;
                    const clientRate = Number((minRate + markupPercent).toFixed(2));
                    onChange({ ...dataRef.current, clientRate, status: 'pending_confirm' });
                    setTimeout(() => onSave(), 0);
                  }} style={{ padding: "10px 24px", backgroundColor: "#f57c00", color: "white", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                    ⭐ 生成客户报价
                  </button>
                );
              } else if (hasAnyAutoRate && manualBrokers.length > 0) {
                // Mix of auto + manual -> save as pending_quote with email needed
                return (
                  <button onClick={() => {
                    onChange({ ...dataRef.current, status: 'pending_quote' });
                    setTimeout(() => onSave(), 0);
                  }} style={{ padding: "10px 24px", backgroundColor: "#7c3aed", color: "white", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                    📨 保存并发券商询价邮件
                  </button>
                );
              } else {
                return (
                  <button onClick={handleCreate} style={{ padding: "10px 24px", backgroundColor: "#1a6cb9", color: "white", border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer" }}>创建询价</button>
                );
              }
            })()}`
);

// 9. Update handleCreateRfq to handle status from newRfq state
// When onSave() is called, it already calls handleCreateRfq which creates the record
// We need it to detect if status = pending_confirm to show client quote modal
// The handleCreateRfq sets status: "draft" currently - we need to preserve newRfq.status

code = code.replace(
  `      status: (finalRfq.brokerIds || []).some(id => {
        const autoRate = lookupBrokerQuote(id, finalRfq.underlyingTicker, finalRfq.tenorDays, finalRfq.strikePercent, finalRfq.optionType);
        return autoRate === null;
      }) ? "pending_quote" as const : "draft" as const,`,
  `      status: (finalRfq as any).status === 'pending_confirm' ? 'pending_confirm' as const : (finalRfq as any).status === 'pending_quote' ? 'pending_quote' as const : 'draft' as const,
      clientRate: (finalRfq as any).clientRate,`
);

// 10. After saving, if status is pending_confirm, show client quote modal
// Find the alert("询价创建成功!") line and add modal trigger
code = code.replace(
  `    setIsCreating(false);
    alert("询价创建成功！");`,
  `    setIsCreating(false);
    if (newRfqRecord.status === 'pending_confirm') {
      setPendingQuoteRfq(newRfqRecord);
      setShowClientQuoteModal(true);
    } else if (newRfqRecord.status === 'pending_quote') {
      // Open email queue for manual brokers
      const manualBrokerQuotes = (newRfqRecord.brokerQuotes || []).filter(q => q.emailStatus === 'pending');
      if (manualBrokerQuotes.length > 0) {
        setEmailQueue([newRfqRecord]);
        setCurrentEmailIndex(0);
        setShowEmailQueue(true);
      }
    } else {
      alert("询价创建成功！");
    }`
);

// 11. Add state variables for client quote modal
code = code.replace(
  `  const [isCreating, setIsCreating] = useState(false);`,
  `  const [isCreating, setIsCreating] = useState(false);
  const [showClientQuoteModal, setShowClientQuoteModal] = useState(false);
  const [pendingQuoteRfq, setPendingQuoteRfq] = useState<RFQ | null>(null);`
);

// 12. Add ClientQuoteModal rendering in main return
code = code.replace(
  `      {showBatchCreate && (
        <BatchRfqModal onClose={() => setShowBatchCreate(false)} onSubmit={handleBatchCreate} />
      )}`,
  `      {showBatchCreate && (
        <BatchRfqModal onClose={() => setShowBatchCreate(false)} onSubmit={handleBatchCreate} />
      )}
      
      {showClientQuoteModal && pendingQuoteRfq && (
        <ClientQuoteModal rfq={pendingQuoteRfq} onClose={() => setShowClientQuoteModal(false)} onSent={() => {
          // Mark as pending_confirm
          const updated = rfqs.map(r => r.id === pendingQuoteRfq.id ? { ...r, status: 'pending_confirm' as const } : r);
          saveRfqsToStorage(updated);
          setRfqs(updated);
          setShowClientQuoteModal(false);
          alert("报价已发送给客户，等待确认。");
        }} />
      )}`
);

// 13. Add the ClientQuoteModal component before RFQPageEnhanced
// Check if it already exists
if (!code.includes('function ClientQuoteModal')) {
  const insertBefore = 'export default function RFQPageEnhanced';
  const clientQuoteModal = `
function ClientQuoteModal({ rfq, onClose, onSent }: { rfq: RFQ, onClose: () => void, onSent?: () => void }) {
  const tenor = TENOR_MAP2[rfq.tenorDays] || (rfq.tenorDays + '天');
  const direction = rfq.optionType === 'CALL' ? '看涨' : '看跌';
  const premium = rfq.clientRate ? (rfq.notional / 10000 * rfq.clientRate / 100).toFixed(4) : '0';
  const premiumWan = rfq.clientRate ? ((rfq.notional / 10000) * rfq.clientRate / 100).toFixed(2) : '0';
  const payDate = rfq.expiryDate ? new Date(new Date(rfq.expiryDate).getTime() - 5 * 24 * 3600000).toISOString().slice(0, 10) : '(到期前5个工作日)';
  
  const emailTemplate = \`尊敬的 \${rfq.client.name}：

就您询价的场外期权，我方报价如下：

【期权标的】\${rfq.underlying.name} (\${rfq.underlying.ticker})
【当前市价】\${rfq.currentPrice ? rfq.currentPrice.toFixed(2) : '--'} \${rfq.currency || 'CNY'}
【期权类型】香草\${direction}期权（European Style）
【行权比例】\${rfq.strikePercent}%
【执行价格】约 \${rfq.strikePrice?.toFixed(2) || '--'} \${rfq.currency || 'CNY'}
【期限】\${tenor}（到期日：\${rfq.expiryDate}）
【名义本金】\${(rfq.notional / 10000).toFixed(0)} 万元
【期权费率】\${rfq.clientRate?.toFixed(2) || '--'}%
【权利金总额】约 \${premiumWan} 万元 \${rfq.currency || 'CNY'}
【缴费日期】\${payDate}

⚠️ 重要提示：
如您接受以上报价，请在确认函中注明同意，并于 \${payDate} 前将权利金 \${premiumWan} 万元 \${rfq.currency || 'CNY'} 汇至我方指定账户。我方收到资金并发出正式确认单后，交易方正式生效。如有任何疑问，欢迎联系您的专属交易员。

此报价有效期至当日收市前。

诚港金融\`;

  const wechatTemplate = \`【场外期权报价 · 诚港金融】

📌 标的：\${rfq.underlying.name}（\${rfq.underlying.ticker}）
📌 类型：香草\${direction}期权
📌 行权价：\${rfq.strikePercent}%（约 \${rfq.strikePrice?.toFixed(2) || '--'} \${rfq.currency || 'CNY'}）
📌 期限：\${tenor}（到期：\${rfq.expiryDate}）
📌 名义本金：\${(rfq.notional / 10000).toFixed(0)} 万元
💰 费率：\${rfq.clientRate?.toFixed(2) || '--'}%
💰 权利金：约 \${premiumWan} 万元

✅ 接受报价后，请于 \${payDate} 前打款，收到资金后我方发出确认单，交易正式生效。\`;

  const [activeTab, setActiveTab] = React.useState<'email' | 'wechat'>('email');
  const content = activeTab === 'email' ? emailTemplate : wechatTemplate;
  
  const copyAndConfirm = () => {
    navigator.clipboard.writeText(content).then(() => {
      if (onSent) onSent();
    });
  };
  
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 640, backgroundColor: "white", borderRadius: 12, display: "flex", flexDirection: "column", maxHeight: "90vh", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e0e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 17, margin: 0, color: "#1a2a3a" }}>📤 向客户发送报价</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#666" }}>×</button>
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid #e0e8f0" }}>
          {(['email', 'wechat'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: "10px", background: activeTab === tab ? "#f0f7ff" : "white", border: "none", borderBottom: activeTab === tab ? "2px solid #1a6cb9" : "none", cursor: "pointer", fontSize: 14, fontWeight: activeTab === tab ? 600 : 400, color: activeTab === tab ? "#1a6cb9" : "#666" }}>
              {tab === 'email' ? '📧 邮件格式' : '💬 微信格式'}
            </button>
          ))}
        </div>
        <div style={{ padding: "16px 20px", overflow: "auto", flex: 1 }}>
          <textarea readOnly value={content} style={{ width: "100%", height: 320, padding: 12, borderRadius: 6, border: "1px solid #d0d8e0", fontSize: 13, lineHeight: 1.7, backgroundColor: "#f8fafd", fontFamily: activeTab === 'email' ? "sans-serif" : "monospace", resize: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ padding: "14px 20px", borderTop: "1px solid #e0e8f0", display: "flex", justifyContent: "flex-end", gap: 12, backgroundColor: "#f8fafd" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", backgroundColor: "white", border: "1px solid #d0d8e0", borderRadius: 6, fontSize: 14, cursor: "pointer" }}>关闭</button>
          <button onClick={copyAndConfirm} style={{ padding: "8px 24px", backgroundColor: "#07c160", color: "white", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            📋 复制内容并标记为"已发送"
          </button>
        </div>
      </div>
    </div>
  );
}

`;
  
  code = code.replace(insertBefore, clientQuoteModal + insertBefore);
}

// Add TENOR_MAP2 alias near the top of the file  
if (!code.includes('const TENOR_MAP2')) {
  code = code.replace(
    `const TENOR_MAP: Record<number, string> = { 30: '1M', 60: '2M', 90: '3M', 180: '6M', 360: '12M' };`,
    `const TENOR_MAP: Record<number, string> = { 30: '1M', 60: '2M', 90: '3M', 180: '6M', 360: '12M' };
const TENOR_MAP2: Record<number, string> = { 30: '1个月', 60: '2个月', 90: '3个月', 180: '6个月', 360: '12个月' };`
  );
}

// Bump version
code = code.replace(/v1\.0\.260304\.007/g, 'v1.0.260304.008');
fs.writeFileSync(file, code);
console.log('Done implementing workflow state machine');
