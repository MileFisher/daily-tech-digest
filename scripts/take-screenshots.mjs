import { chromium } from 'playwright';

const URL = 'https://milefisher.github.io/daily-tech-digest/';

const browser = await chromium.launch({ headless: true });

// Desktop 1280×800
let page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1000);
await page.screenshot({ path: 'screenshots/desktop-1280x800.png', fullPage: true });
console.log('✅ Desktop screenshot saved');
await page.close();

// Mobile 390×844 — also switch to MY and take another
page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(500);
await page.screenshot({ path: 'screenshots/mobile-390x844.png', fullPage: true });
console.log('✅ Mobile screenshot saved');
await page.close();

await browser.close();
