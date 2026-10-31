import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const targets = [
  { name: 'landing-1440-full', url: 'http://localhost:3000/', width: 1440, height: 900, fullPage: true },
  { name: 'landing-375-full', url: 'http://localhost:3000/', width: 375, height: 812, fullPage: true },
  { name: 'demo-1440-full', url: 'http://localhost:3000/demo', width: 1440, height: 900, fullPage: true },
  { name: 'demo-375-full', url: 'http://localhost:3000/demo', width: 375, height: 812, fullPage: true },
  { name: 'dashboard-1440-full', url: 'http://localhost:3000/dashboard', width: 1440, height: 900, fullPage: true },
  { name: 'dashboard-375-full', url: 'http://localhost:3000/dashboard', width: 375, height: 812, fullPage: true },
];

async function run() {
  console.log('Launching Chrome for fullpage captures...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  for (const t of targets) {
    await page.setViewport({ width: t.width, height: t.height, deviceScaleFactor: 2 });
    await page.goto(t.url, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1200));

    // If demo page, let's trigger a chip click so it shows live tool checklist!
    if (t.name.includes('demo')) {
      try {
        const chips = await page.$$('button');
        for (const chip of chips) {
          const text = await page.evaluate(el => el.textContent, chip);
          if (text.includes('My settlement is late')) {
            await chip.click();
            await new Promise(r => setTimeout(r, 3800)); // wait for tools to execute
            break;
          }
        }
      } catch (e) {
        console.log('Chip interaction skip:', e.message);
      }
    }

    const outPath = path.resolve('screenshots', `${t.name}.png`);
    await page.screenshot({ path: outPath, fullPage: t.fullPage });
    console.log(`Saved ${outPath}`);
  }

  await browser.close();
  console.log('Done fullpage captures!');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

