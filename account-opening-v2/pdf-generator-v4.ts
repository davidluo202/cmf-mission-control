${data.bankAccounts && data.bankAccounts.length > 0 ? `
## 銀行賬戶信息 Bank Account Information

| 銀行名稱 Bank Name | 賬戶號碼 Account Number | 賬戶持有人 Account Holder | 銀行所在地 Bank Location |
|-------------------|------------------------|-------------------------|------------------------|
${data.bankAccounts.map((account: any) => `| ${account.bankName || 'N/A'} | ${account.accountNumber || 'N/A'} | ${account.accountHolderName || 'N/A'} | ${account.bankLocation || 'N/A'} |`).join('\n')}

---
` : ''}

## 申請人聲明及簽署 Applicant Declaration and Signature

本人聲明以上所填寫的資料均屬真實、準確和完整，並同意遵守貴公司的條款及細則。

I declare that the information provided above is true, accurate and complete, and I agree to comply with the terms and conditions of the company.

**申請人簽名 Applicant Signature:** _______________________________

**簽署日期 Date:** ${formatDate(data.submittedAt || new Date())}

---

<div style="text-align: center; margin-top: 40px; color: #666; font-size: 12px;">
<p>誠港金融股份有限公司 CM Financial Limited</p>
<p>此文件由系統自動生成 This document is generated automatically by the system</p>
<p>生成時間 Generated at: ${new Date().toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong' })}</p>
</div>
`;

  // 创建临时文件
  const tmpDir = os.tmpdir();
  const mdFile = path.join(tmpDir, `application-${Date.now()}.md`);
  const pdfFile = path.join(tmpDir, `application-${Date.now()}.pdf`);

  try {
    // 写入Markdown文件
    await fs.writeFile(mdFile, markdown, 'utf-8');

    // 使用manus-md-to-pdf命令生成PDF
    await execAsync(`manus-md-to-pdf "${mdFile}" "${pdfFile}"`);

    // 读取PDF文件
    const pdfBuffer = await fs.readFile(pdfFile);

    // 清理临时文件
    await fs.unlink(mdFile).catch(() => {});
    await fs.unlink(pdfFile).catch(() => {});

    return pdfBuffer;
  } catch (error) {
    // 清理临时文件
    await fs.unlink(mdFile).catch(() => {});
    await fs.unlink(pdfFile).catch(() => {});
    throw error;
  }
}
