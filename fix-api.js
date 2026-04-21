const fs = require('fs');

// 1. Update import.js
let importCode = fs.readFileSync('otc-trading-system/api/broker-quotes/import.js', 'utf8');
importCode = importCode.replace('CREATE TABLE IF NOT EXISTS haitong_quotes (', `CREATE TABLE IF NOT EXISTS haitong_quotes (
        broker VARCHAR(50) DEFAULT 'HTI',`);
importCode = importCode.replace('INSERT INTO haitong_quotes (ticker, name, notional, quotes, quote_date)', 'INSERT INTO haitong_quotes (broker, ticker, name, notional, quotes, quote_date)');
importCode = importCode.replace('VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE))', 'VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE))');
importCode = importCode.replace('const quoteDate = body.quoteDate; // optional', 'const quoteDate = body.quoteDate; // optional\n    const broker = body.broker || "HTI";');
importCode = importCode.replace('await p.query(insertSql, [ticker, name, notional ?? null, quotes, quoteDate ?? null]);', 'await p.query(insertSql, [broker, ticker, name, notional ?? null, quotes, quoteDate ?? null]);');
importCode = importCode.replace('await p.query(\'CREATE INDEX IF NOT EXISTS idx_haitong_quotes_ticker ON haitong_quotes(ticker);\');', 'await p.query(\'ALTER TABLE haitong_quotes ADD COLUMN IF NOT EXISTS broker VARCHAR(50) DEFAULT \\\'HTI\\\';\');\n    await p.query(\'CREATE INDEX IF NOT EXISTS idx_haitong_quotes_ticker ON haitong_quotes(ticker);\');');
fs.writeFileSync('otc-trading-system/api/broker-quotes/import.js', importCode);

// 2. Update latest.js
let latestCode = fs.readFileSync('otc-trading-system/api/broker-quotes/latest.js', 'utf8');
latestCode = latestCode.replace('SELECT ticker, name, notional, quotes, quote_date', 'SELECT broker, ticker, name, notional, quotes, quote_date');
fs.writeFileSync('otc-trading-system/api/broker-quotes/latest.js', latestCode);

console.log('API fixed');
