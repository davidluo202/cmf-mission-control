const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/RFQPageEnhanced.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldModal = `function ClientQuoteModal({ rfq, onClose, onSent }: { rfq: RFQ, onClose: () => void, onSent?: () => void }) {
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
}`;

const newModal = `function ClientQuoteModal({ rfq, onClose, onSent }: { rfq: RFQ, onClose: () => void, onSent?: () => void }) {
  const tenor = TENOR_MAP2[rfq.tenorDays] || (rfq.tenorDays + '天');
  const direction = rfq.optionType === 'CALL' ? '看涨' : '看跌';
  const premiumWan = rfq.clientRate ? ((rfq.notional / 10000) * rfq.clientRate / 100).toFixed(2) : '0';
  const payDate = rfq.expiryDate ? new Date(new Date(rfq.expiryDate).getTime() - 5 * 24 * 3600000).toISOString().slice(0, 10) : '(到期前5个工作日)';

  const defaultEmailBody = \`尊敬的 \${rfq.client.name}，

就您询价的场外期权，我方报价如下：

期权标的：\${rfq.underlying.name} (\${rfq.underlying.ticker})
当前市价：\${rfq.currentPrice ? rfq.currentPrice.toFixed(2) : '--'} \${rfq.currency || 'CNY'}
期权类型：香草\${direction}期权（European Style）
行权比例：\${rfq.strikePercent}%
执行价格：约 \${rfq.strikePrice?.toFixed(2) || '--'} \${rfq.currency || 'CNY'}
期限：\${tenor}（到期日：\${rfq.expiryDate}）
名义本金：\${(rfq.notional / 10000).toFixed(0)} 万元
期权费率：\${rfq.clientRate?.toFixed(2) || '--'}%
权利金总额：约 \${premiumWan} 万元 \${rfq.currency || 'CNY'}
缴费日期：\${payDate}

⚠️ 重要提示：
如您接受以上报价，请于 \${payDate} 前将权利金 \${premiumWan} 万元 \${rfq.currency || 'CNY'} 汇至我方指定账户。我方收到资金并发出正式确认单后，交易方正式生效。如有任何疑问，欢迎联系您的专属交易员。

此报价有效期至当日收市前。

诚港金融\`;

  const wechatText = \`【场外期权报价 · 诚港金融】

📌 标的：\${rfq.underlying.name}（\${rfq.underlying.ticker}）
📌 类型：香草\${direction}期权
📌 行权价：\${rfq.strikePercent}%（约 \${rfq.strikePrice?.toFixed(2) || '--'} \${rfq.currency || 'CNY'}）
📌 期限：\${tenor}（到期：\${rfq.expiryDate}）
📌 名义本金：\${(rfq.notional / 10000).toFixed(0)} 万元
💰 费率：\${rfq.clientRate?.toFixed(2) || '--'}%
💰 权利金：约 \${premiumWan} 万元 \${rfq.currency || 'CNY'}
📅 缴费日期：\${payDate}

✅ 接受报价后，请于上述日期前打款，收到资金后我方发出正式确认单，交易方生效。\`;

  const [step, setStep] = React.useState<'choose' | 'email' | 'wechat'>('choose');
  const [emailBody, setEmailBody] = React.useState(defaultEmailBody);
  const [emailSubject, setEmailSubject] = React.useState(\`场外期权报价 - \${rfq.underlying.name} \${rfq.rfqCode}\`);
  const [copied, setCopied] = React.useState(false);

  const clientEmail = rfq.client.email || '';

  const handleSendEmail = () => {
    const mailto = \`mailto:\${encodeURIComponent(clientEmail)}?subject=\${encodeURIComponent(emailSubject)}&body=\${encodeURIComponent(emailBody)}\`;
    window.open(mailto);
    if (onSent) onSent();
  };

  const handleCopyWechat = () => {
    navigator.clipboard.writeText(wechatText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleWechatConfirm = () => {
    if (onSent) onSent();
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: step === 'choose' ? 420 : 660, backgroundColor: "white", borderRadius: 12, display: "flex", flexDirection: "column", maxHeight: "92vh", boxShadow: "0 12px 40px rgba(0,0,0,0.25)", transition: "width 0.2s" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e0e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, margin: 0, color: "#1a2a3a" }}>
            {step === 'choose' ? '📤 选择发送方式' : step === 'email' ? '📧 邮件报价' : '💬 微信报价'}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999" }}>×</button>
        </div>

        {/* Step: Choose */}
        {step === 'choose' && (
          <div style={{ padding: "32px 24px", display: "flex", gap: 20, justifyContent: "center" }}>
            <button onClick={() => setStep('email')} style={{ flex: 1, padding: "28px 16px", border: "2px solid #d0d8e0", borderRadius: 12, background: "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, transition: "all 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#1a6cb9', e.currentTarget.style.background = '#f0f7ff')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#d0d8e0', e.currentTarget.style.background = 'white')}>
              <span style={{ fontSize: 40 }}>📧</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#1a2a3a" }}>电子邮件</span>
              <span style={{ fontSize: 12, color: "#6a7a8a", textAlign: "center" }}>打开邮件客户端<br />编辑后直接发送</span>
            </button>
            <button onClick={() => setStep('wechat')} style={{ flex: 1, padding: "28px 16px", border: "2px solid #d0d8e0", borderRadius: 12, background: "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, transition: "all 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#07c160', e.currentTarget.style.background = '#f0fdf4')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#d0d8e0', e.currentTarget.style.background = 'white')}>
              <span style={{ fontSize: 40 }}>💬</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#1a2a3a" }}>微信 / 其他</span>
              <span style={{ fontSize: 12, color: "#6a7a8a", textAlign: "center" }}>一键复制报价内容<br />粘贴到微信发送</span>
            </button>
          </div>
        )}

        {/* Step: Email */}
        {step === 'email' && (
          <>
            <div style={{ padding: "16px 20px", overflow: "auto", flex: 1 }}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>收件人</label>
                <input value={clientEmail || '(请在客户管理中配置邮箱)'} readOnly style={{ width: "100%", padding: "8px 10px", border: "1px solid #d0d8e0", borderRadius: 4, fontSize: 13, backgroundColor: "#f8fafd", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>主题</label>
                <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #d0d8e0", borderRadius: 4, fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>正文（可编辑）</label>
                <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} style={{ width: "100%", height: 290, padding: 10, borderRadius: 4, border: "1px solid #d0d8e0", fontSize: 13, lineHeight: 1.7, resize: "vertical", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid #e0e8f0", display: "flex", justifyContent: "space-between", gap: 12, backgroundColor: "#f8fafd" }}>
              <button onClick={() => setStep('choose')} style={{ padding: "8px 14px", backgroundColor: "white", border: "1px solid #d0d8e0", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>← 返回</button>
              <button onClick={handleSendEmail} style={{ padding: "8px 24px", backgroundColor: "#1a6cb9", color: "white", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                📧 打开邮件客户端发出
              </button>
            </div>
          </>
        )}

        {/* Step: WeChat */}
        {step === 'wechat' && (
          <>
            <div style={{ padding: "16px 20px", overflow: "auto", flex: 1 }}>
              <p style={{ fontSize: 13, color: "#6a7a8a", margin: "0 0 10px" }}>以下内容已为微信格式优化，点击"一键复制"后粘贴到微信发送：</p>
              <textarea readOnly value={wechatText} style={{ width: "100%", height: 300, padding: 12, borderRadius: 6, border: "1px solid #d0d8e0", fontSize: 13, lineHeight: 1.8, backgroundColor: "#f8fafd", fontFamily: "monospace", resize: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid #e0e8f0", display: "flex", justifyContent: "space-between", gap: 12, backgroundColor: "#f8fafd" }}>
              <button onClick={() => setStep('choose')} style={{ padding: "8px 14px", backgroundColor: "white", border: "1px solid #d0d8e0", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>← 返回</button>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleCopyWechat} style={{ padding: "8px 20px", backgroundColor: copied ? "#16a34a" : "#07c160", color: "white", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  {copied ? '✅ 已复制！' : '📋 一键复制内容'}
                </button>
                <button onClick={handleWechatConfirm} disabled={!copied} style={{ padding: "8px 20px", backgroundColor: copied ? "#f57c00" : "#e5e7eb", color: copied ? "white" : "#9ca3af", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: copied ? "pointer" : "not-allowed" }}>
                  确认已发送 →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}`;

code = code.replace(oldModal, newModal);

// Update CLIENTS to include email field
code = code.replace(
  `const CLIENTS = [
  { id: 1, name: "李先生", code: "C001", email: "li@email.com" },
  { id: 2, name: "王公司", code: "C002", email: "wang@company.com" },
];`,
  `const CLIENTS = [
  { id: 1, name: "李先生", code: "C001", email: "li@email.com" },
  { id: 2, name: "王公司", code: "C002", email: "wang@company.com" },
];`
);

// Bump version
code = code.replace(/v1\.0\.260304\.010/g, 'v1.0.260304.011');
fs.writeFileSync(file, code);
console.log('Done');
