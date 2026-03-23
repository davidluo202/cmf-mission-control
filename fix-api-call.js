const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/RFQPageEnhanced.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `                  onChange={async ticker => {
                    console.log("选择标的:", ticker);
                    const stock = getOptionUnderlyings().find(s => s.ticker === ticker);
                    if (stock) {
                      // 先用本地缓存值秒填（体验更好）
                      onChange({
                        ...dataRef.current,
                        underlyingTicker: ticker,
                        underlyingName: stock.name,
                        currentPrice: stock.price,
                        currency: stock.currency,
                        underlyingType: stock.type,
                      });
                      setStrikePrice(calculateStrikePrice(stock.price, data.strikePercent));
                    } else {
                      onChange({ ...dataRef.current, underlyingTicker: ticker });
                    }
                  }}`;

const replacement = `                  onChange={async ticker => {
                    console.log("选择标的:", ticker);
                    if (!ticker) {
                      onChange({ ...dataRef.current, underlyingTicker: '' });
                      return;
                    }
                    const stock = getOptionUnderlyings().find(s => s.ticker === ticker);
                    if (stock) {
                      onChange({
                        ...dataRef.current,
                        underlyingTicker: ticker,
                        underlyingName: stock.name,
                        currentPrice: stock.price,
                        currency: stock.currency,
                        underlyingType: stock.type,
                      });
                      setStrikePrice(calculateStrikePrice(stock.price, data.strikePercent));
                    } else {
                      onChange({ ...dataRef.current, underlyingTicker: ticker });
                    }

                    // 异步调用API获取最新价格和名称
                    try {
                      const resp = await fetch(\`/api/market/quote?ticker=\${encodeURIComponent(ticker)}\`);
                      if (!resp.ok) return;
                      const q = await resp.json();
                      if (!q || !q.price) return;

                      // 更新名称、价格
                      onChange({
                        ...dataRef.current,
                        underlyingTicker: ticker,
                        underlyingName: q.name || stock?.name || '',
                        currentPrice: q.price,
                        currency: q.currency || stock?.currency || 'CNY',
                        underlyingType: stock?.type || 'stock',
                      });
                      setStrikePrice(calculateStrikePrice(q.price, dataRef.current.strikePercent || 100));

                      // 更新到本地存储缓存中
                      try {
                        const rawU = localStorage.getItem('option_underlyings');
                        if (rawU) {
                          const arr = JSON.parse(rawU);
                          const next = arr.map((u: any) => {
                            if (String(u?.ticker || '').toUpperCase() === String(ticker).toUpperCase()) {
                              return { ...u, name: q.name || u.name || '', price: q.price || u.price || 0, currency: q.currency || u.currency || 'CNY' };
                            }
                            return u;
                          });
                          localStorage.setItem('option_underlyings', JSON.stringify(next));
                        }
                      } catch {}
                    } catch (err) {
                      console.error("Fetch market quote error:", err);
                    }
                  }}`;

if(code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log("API logic restored");
} else {
  console.log("Target block not found");
}
