import { chromium } from 'playwright';

const URL = 'https://milefisher.github.io/daily-tech-digest/';

const browser = await chromium.launch({ headless: true });

// Desktop dark mode 1280×800
let page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
// Enable dark mode
await page.evaluate(() => {
  document.documentElement.setAttribute('data-theme', 'dark');
  localStorage.setItem('theme', 'dark');
});
await page.waitForTimeout(1000);
await page.screenshot({ path: 'screenshots/desktop-dark-1280x800.png', fullPage: true });
console.log('✅ Desktop dark screenshot saved');
await page.close();

await browser.close();
