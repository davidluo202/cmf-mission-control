# 翻譯測試結果

## 預覽頁面（Application Preview）

### 財務狀況 Financial Status
- **收入來源 Income Source**: business （**未翻譯**，應顯示為"業務收入"）
- 年收入 Annual Income: HKD 500,000 - 1,000,000 ✓
- 流動資產 Liquid Asset: HKD 3,000,000 - 5,000,000 ✓
- 淨資產 Net Worth: HKD 5,000,000 - 10,000,000 ✓

### 投資信息 Investment Information
- 投資目的 Investment Objective: 資本增值, 資本保值 ✓
- 投資經驗 Investment Experience: 股票: 3-5年; 基金: 3-5年; 外匯: 1-3年; 商品: 5年以上 ✓
- 風險承受能力 Risk Tolerance: R3 - 中風險：在一定時間內，本金安全具有一定的不穩定性，基金淨值會有適度波動，或造成一定的本金虧損 ✓

## 問題發現
1. 收入來源"business"未翻譯為中文，應顯示為"業務收入"
2. 需要檢查ApplicationPreview.tsx中是否正確使用translate函數
