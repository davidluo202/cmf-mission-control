const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  // Start the server
  const { spawn } = require('child_process');
  const server = spawn('npm', ['run', 'preview'], { cwd: 'otc-trading-system/packages/client' });
  
  // Wait a bit for server to start
  await new Promise(r => setTimeout(r, 3000));
  
  try {
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
    console.log("Page loaded!");
  } catch (e) {
    console.log("Failed to load", e.message);
  }
  
  await browser.close();
  server.kill();
})();
