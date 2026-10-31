import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const targets = [
  { name: 'landing-1440', url: 'http://localhost:3000/', width: 1440, height: 900 },
  { name: 'landing-375', url: 'http://localhost:3000/', width: 375, height: 812 },
  { name: 'demo-1440', url: 'http://localhost:3000/demo', width: 1440, height: 900 },
  { name: 'demo-375', url: 'http://localhost:3000/demo', width: 375, height: 812 },
  { name: 'dashboard-1440', url: 'http://localhost:3000/dashboard', width: 1440, height: 900 },
  { name: 'dashboard-375', url: 'http://localhost:3000/dashboard', width: 375, height: 812 },
];

async function run() {
  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  for (const t of targets) {
    console.log(`Capturing ${t.name} (${t.width}x${t.height}) from ${t.url}...`);
    await page.setViewport({ width: t.width, height: t.height, deviceScaleFactor: 2 });
    await page.goto(t.url, { waitUntil: 'networkidle0', timeout: 15000 });
    // Small pause for Framer motion and fonts
    await new Promise(r => setTimeout(r, 1200));

    const outPath = path.resolve('screenshots', `${t.name}.png`);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved ${outPath}`);
  }

  await browser.close();
  console.log('Done capturing screenshots!');
}

run().catch(err => {
  console.error('Error running script:', err);
  process.exit(1);
});

