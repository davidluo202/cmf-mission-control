  <div class="footer">
    <p>誠港金融股份有限公司 CM Financial Limited</p>
    <p>此文件由系統自動生成 This document is generated automatically by the system</p>
    <p>生成時間 Generated at: ${new Date().toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong' })}</p>
  </div>
</body>
</html>
  `;

  // 使用puppeteer生成PDF
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });

    await browser.close();
    return Buffer.from(pdfBuffer);
  } catch (error) {
    await browser.close();
    throw error;
  }
}
