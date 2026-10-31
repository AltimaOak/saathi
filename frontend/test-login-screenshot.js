import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // 1. Screenshot login page
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.resolve('screenshots', 'login-1440.png') });
  console.log('Saved login-1440.png');

  // 2. Screenshot personalized dashboard
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.resolve('screenshots', 'dashboard-merchant-1440.png') });
  console.log('Saved dashboard-merchant-1440.png');

  await browser.close();
}

run().catch(console.error);

