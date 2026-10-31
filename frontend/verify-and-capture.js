import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\adi14\\.gemini\\antigravity\\brain\\88be636b-f9b8-4131-b38b-7d1b56c5e662';

async function main() {
  console.log('Launching Chrome to verify live cross-tab demo & dashboard sync...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  // Tab 1: Dashboard
  const dashboardPage = await browser.newPage();
  await dashboardPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await dashboardPage.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0', timeout: 15000 });
  console.log('Dashboard opened in Tab 1');

  // Tab 2: Demo Chat
  const demoPage = await browser.newPage();
  await demoPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await demoPage.goto('http://localhost:3000/demo', { waitUntil: 'networkidle0', timeout: 15000 });
  console.log('Demo Chat opened in Tab 2');

  // Click quick chip "My settlement is late" or "Mera paisa nahi aaya"
  console.log('Sending message in Demo Chat...');
  const buttons = await demoPage.$$('button');
  let clicked = false;
  for (const b of buttons) {
    const txt = await demoPage.evaluate(el => el.textContent, b);
    if (txt && txt.includes('My settlement is late')) {
      await b.click();
      clicked = true;
      console.log('Clicked "My settlement is late" quick chip');
      break;
    }
  }

  // Wait for Saathi to execute tools and render response & card
  await new Promise(r => setTimeout(r, 4500));

  // Screenshot Demo 1440px
  const demo1440Path = path.resolve('screenshots', 'demo-1440-live.png');
  await demoPage.screenshot({ path: demo1440Path, fullPage: true });
  console.log(`Saved ${demo1440Path}`);

  // Screenshot Demo 375px mobile
  await demoPage.setViewport({ width: 375, height: 812, deviceScaleFactor: 1 });
  await new Promise(r => setTimeout(r, 1000));
  const demo375Path = path.resolve('screenshots', 'demo-375-live.png');
  await demoPage.screenshot({ path: demo375Path, fullPage: true });
  console.log(`Saved ${demo375Path}`);

  // Now switch back to Tab 1 (Dashboard) and verify live sync!
  await dashboardPage.bringToFront();
  console.log('Checking Tab 1 (Dashboard) for live polled action...');
  await new Promise(r => setTimeout(r, 3000)); // wait up to 3s for poller to catch new action

  // Check if new action row or toast appeared
  const bodyText = await dashboardPage.evaluate(() => document.body.innerText);
  const synced = bodyText.includes('settlement') || bodyText.includes('IMPS') || bodyText.includes('Solved');
  console.log(`Live sync verified in dashboard: ${synced}`);

  // Screenshot Dashboard 1440px
  const dash1440Path = path.resolve('screenshots', 'dashboard-1440-live.png');
  await dashboardPage.screenshot({ path: dash1440Path, fullPage: true });
  console.log(`Saved ${dash1440Path}`);

  // Screenshot Dashboard 375px mobile
  await dashboardPage.setViewport({ width: 375, height: 812, deviceScaleFactor: 1 });
  await new Promise(r => setTimeout(r, 1000));
  const dash375Path = path.resolve('screenshots', 'dashboard-375-live.png');
  await dashboardPage.screenshot({ path: dash375Path, fullPage: true });
  console.log(`Saved ${dash375Path}`);

  // Landing page 1440px and 375px
  const landingPage = await browser.newPage();
  await landingPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await landingPage.goto('http://localhost:3000/', { waitUntil: 'networkidle0', timeout: 15000 });
  const landing1440Path = path.resolve('screenshots', 'landing-1440-live.png');
  await landingPage.screenshot({ path: landing1440Path, fullPage: true });
  console.log(`Saved ${landing1440Path}`);

  await landingPage.setViewport({ width: 375, height: 812, deviceScaleFactor: 1 });
  await new Promise(r => setTimeout(r, 800));
  const landing375Path = path.resolve('screenshots', 'landing-375-live.png');
  await landingPage.screenshot({ path: landing375Path, fullPage: true });
  console.log(`Saved ${landing375Path}`);

  // Login page 1440px
  await landingPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await landingPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle0', timeout: 15000 });
  const login1440Path = path.resolve('screenshots', 'login-1440-live.png');
  await landingPage.screenshot({ path: login1440Path, fullPage: true });
  console.log(`Saved ${login1440Path}`);

  await browser.close();

  // Copy screenshots to artifact directory
  const filesToCopy = [
    'demo-1440-live.png',
    'demo-375-live.png',
    'dashboard-1440-live.png',
    'dashboard-375-live.png',
    'landing-1440-live.png',
    'landing-375-live.png',
    'login-1440-live.png'
  ];

  for (const f of filesToCopy) {
    const src = path.resolve('screenshots', f);
    const dest = path.join(ARTIFACT_DIR, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`Copied ${f} to artifact directory`);
    }
  }

  console.log('All verification captures completed successfully!');
}

main().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});

