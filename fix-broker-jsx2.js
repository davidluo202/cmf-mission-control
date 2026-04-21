const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/RFQPageEnhanced.tsx';
let code = fs.readFileSync(file, 'utf8');

// Find the entire broken broker IIFE block and replace cleanly
const brokenIIFE = `            {(() => {
              const validRates = Object.values(autoBrokerRates).filter(r => r > 0);
              const minRate = validRates.length > 0 ? Math.min(...validRates) : null;
              return (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, minHeight: 120 }}>`;

const cleanStart = `            {/* Broker list - minRate computed inline via IIFE per broker */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, minHeight: 120 }}>`;

code = code.replace(brokenIIFE, cleanStart);

// Remove the closing )} that was the IIFE return
// The bad closing pattern we added: "              </div>\n              );\n            })()}"
const brokenClose = `              </div>
            )}`;
const cleanClose = `            </div>`;
code = code.replace(brokenClose, cleanClose);

// Fix broker card highlight - change to use an inline computation per broker
// Old: backgroundColor: (checked && minRate !== null && autoBrokerRates[broker.id] === minRate) ?
// New: backgroundColor: (() => { const allRates = Object.values(autoBrokerRates).filter(r=>r>0); const mn = allRates.length>0?Math.min(...allRates):null; return (checked && mn !== null && autoBrokerRates[broker.id] === mn); })() ? 
const oldHighlight = `backgroundColor: (checked && minRate !== null && autoBrokerRates[broker.id] === minRate) ? "#fff8e1" : (checked ? "#e8f2fc" : "white"),
                    borderColor: (checked && minRate !== null && autoBrokerRates[broker.id] === minRate) ? "#ffb300" : "#d0d8e0",
                    boxShadow: (checked && minRate !== null && autoBrokerRates[broker.id] === minRate) ? "0 0 0 1px #ffb300" : "none",`;
const newHighlight = `backgroundColor: (() => { const rts=Object.values(autoBrokerRates).filter(r=>r>0); const mn=rts.length>0?Math.min(...rts):null; return (checked&&mn!==null&&autoBrokerRates[broker.id]===mn)?"#fff8e1":(checked?"#e8f2fc":"white"); })(),
                    borderColor: (() => { const rts=Object.values(autoBrokerRates).filter(r=>r>0); const mn=rts.length>0?Math.min(...rts):null; return (checked&&mn!==null&&autoBrokerRates[broker.id]===mn)?"#ffb300":"#d0d8e0"; })(),
                    boxShadow: (() => { const rts=Object.values(autoBrokerRates).filter(r=>r>0); const mn=rts.length>0?Math.min(...rts):null; return (checked&&mn!==null&&autoBrokerRates[broker.id]===mn)?"0 0 0 2px #ffb300":"none"; })(),`;

code = code.replace(oldHighlight, newHighlight);

fs.writeFileSync(file, code);
console.log('Done');
