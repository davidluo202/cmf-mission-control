const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/admin/BrokerQuoteImportPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add forceType state
code = code.replace(
  `const [broker, setBroker] = useState('HTI');`,
  `const [broker, setBroker] = useState('HTI');\n  const [forceType, setForceType] = useState('auto');`
);

// 2. Add UI for forceType
const brokerUI = `</select>
          </div>`;
const newBrokerUI = `</select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#3a4a5a' }}>标的类型(选填)</label>
            <select 
              value={forceType} 
              onChange={e => setForceType(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, minWidth: 120 }}
            >
              <option value="auto">自动识别</option>
              <option value="stock">强制设为：个股</option>
              <option value="etf">强制设为：ETF/股指</option>
            </select>
          </div>`;
code = code.replace(brokerUI, newBrokerUI);

// 3. Update the type logic when saving to underlyingsMap
const typeExtract = `const importedType = mq._type || 'stock';`;
const newTypeExtract = `let importedType = mq._type || 'stock';\n          if (forceType !== 'auto') importedType = forceType;`;
code = code.replace(typeExtract, newTypeExtract);

fs.writeFileSync(file, code);
console.log("Updated BrokerQuoteImportPage.tsx");
