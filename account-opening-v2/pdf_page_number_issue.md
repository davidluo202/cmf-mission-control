# PDF頁碼問題分析

## 觀察結果

查看CMF-ACAPP-260201-003.pdf（共6頁）：

- **第1頁**：頁眉Logo正確顯示，未看到頁碼
- **第2頁**：頁眉Logo正確顯示，包含完整的客戶合規聲明內容（PEP、US Person、反洗錢、開戶協議），未看到頁碼
- **第6頁**：幾乎空白，只有"第3页"顯示在頁面頂部中央

## 問題分析

1. **頁碼位置錯誤**：頁碼應該在頁面底部（Y坐標約為`doc.page.height - 50`），但實際顯示在頁面頂部
2. **頁碼數字錯誤**：第6頁顯示"第3页"，說明循環索引有問題
3. **多了空白頁**：第6頁是多餘的空白頁

## 根本原因

在`pdf-generator-v7.ts`第635行使用了錯誤的Y坐標：
```typescript
doc.text(pageNumberText, 0, doc.page.height - 50, {
  align: 'center',
  width: doc.page.width,
  lineBreak: false,
});
```

雖然指定了`doc.page.height - 50`作為Y坐標，但PDFKit的`doc.text()`方法在使用絕對定位時仍然會移動當前游標位置，導致創建了額外的空白頁。

## 解決方案

需要使用PDFKit的事件監聽器（`pageAdded`事件）來在每個新頁面創建時自動添加頁眉和頁腳，而不是在所有內容生成後再遍歷頁面。
