const fs = require('fs');
const file = 'otc-trading-system/packages/client/src/pages/RFQPageEnhanced.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove the entire try-catch block for the API call in onChange
const apiCallBlockRegex = /\/\/ 再异步从后台 API 补全[\s\S]*?catch \{\}/;
code = code.replace(apiCallBlockRegex, '');

// 2. Fix FormSearchSelect so we can clear the input
const oldSelectSearch = `      <input 
        value={search || selectedLabel || options.find(o => o.value === value)?.label || value}
        onChange={e => { setSearch(e.target.value); setSelectedLabel(""); setShowDropdown(true); }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        placeholder="输入代码或名称搜索..."
        style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d8e0", borderRadius: 4, fontSize: 14, backgroundColor: "white" }}
      />`;

const newSelectSearch = `      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        <input 
          value={search !== "" ? search : (selectedLabel || options.find(o => o.value === value)?.label || value)}
          onChange={e => { 
            setSearch(e.target.value); 
            setSelectedLabel(""); 
            setShowDropdown(true);
            if (e.target.value === "") {
              onChange(""); // Allow clearing
            }
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder="输入代码或名称搜索..."
          style={{ width: "100%", padding: "10px 24px 10px 12px", border: "1px solid #d0d8e0", borderRadius: 4, fontSize: 14, backgroundColor: "white" }}
        />
        {(search || value) && (
          <button 
            type="button"
            onClick={() => { setSearch(""); setSelectedLabel(""); onChange(""); setShowDropdown(false); }}
            style={{ position: 'absolute', right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
          >
            ×
          </button>
        )}
      </div>`;

code = code.replace(oldSelectSearch, newSelectSearch);

// Bump version
code = code.replace(/v1\.0\.260303\.015/g, 'v1.0.260303.016');

fs.writeFileSync(file, code);
