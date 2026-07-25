// Quick Playwright smoke test for daily-tech-digest
// Usage: node scripts/smoke-test.mjs

import { chromium } from 'playwright';

const URL = 'https://milefisher.github.io/daily-tech-digest/';
const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  tablet:  { width: 600,  height: 1024 },
  mobile:  { width: 390,  height: 844 },
};

let failed = 0;

async function run() {
  const browser = await chromium.launch({ headless: true });

  // ── Desktop ──────────────────────────────────────────────────────────
  console.log('\n═══ DESKTOP (1280×800) ═══\n');
  let page = await browser.newPage({ viewport: VIEWPORTS.desktop });
  await testPage(page, 'desktop');
  await page.close();

  // ── Tablet ───────────────────────────────────────────────────────────
  console.log('\n═══ TABLET (768×1024) ═══\n');
  page = await browser.newPage({ viewport: VIEWPORTS.tablet });
  await testPage(page, 'tablet');
  await page.close();

  // ── Mobile ───────────────────────────────────────────────────────────
  console.log('\n═══ MOBILE (390×844) ═══\n');
  page = await browser.newPage({ viewport: VIEWPORTS.mobile });
  await testPage(page, 'mobile');
  await page.close();

  await browser.close();

  // Summary
  console.log(`\n${'═'.repeat(45)}`);
  if (failed === 0) {
    console.log('✅ All checks passed!');
  } else {
    console.log(`❌ ${failed} check(s) failed.`);
  }
  process.exit(failed > 0 ? 1 : 0);
}

async function testPage(page, label) {
  const errors = [];

  // Collect console errors
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  // Navigate
  console.log(`  Loading ${URL} ...`);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

  // ── 1. No console errors ──────────────────────────────────────────────
  check(label, 'No console errors', errors.length === 0, {
    detail: errors.length ? errors.slice(0, 3).join('; ') : undefined,
  });

  // ── 2. Title rendered ─────────────────────────────────────────────────
  const title = await page.textContent('#siteTitle');
  check(label, 'Site title visible', title?.length > 0, { detail: title });

  // ── 3. Main content loaded (not loading/error) ────────────────────────
  const contentText = await page.textContent('#content');
  const hasStories = contentText.includes('PTS') || contentText.includes('k') || contentText.includes('pts');
  const isLoading = contentText.includes('Aggregating');
  check(label, 'Stories rendered', hasStories && !isLoading, { detail: contentText.slice(0, 80) });

  // ── 4. Hero section exists ────────────────────────────────────────────
  const heroLinks = await page.$$('.hero a');
  check(label, 'Hero story has links', heroLinks.length >= 2);

  // ── 5. Story grid cards exist ─────────────────────────────────────────
  const cards = await page.$$('.story-card');
  check(label, `Story cards present (${cards.length})`, cards.length >= 3);

  // ── 6. Language toggle works ──────────────────────────────────────────
  const langEn = await page.$('#langEn');
  if (langEn) {
    // Switch to MY
    await page.click('#langMy');
    await page.waitForTimeout(500);
    const myTitle = await page.textContent('#siteTitle');
    const myTitleOk = myTitle.includes('နည်းပညာ');

    // Switch back to EN
    await page.click('#langEn');
    await page.waitForTimeout(500);
    const enTitle = await page.textContent('#siteTitle');
    const enTitleOk = enTitle.includes('Daily Tech');

    check(label, 'Language toggle EN ↔ MY', myTitleOk && enTitleOk, {
      detail: `MY: "${myTitle}", EN: "${enTitle}"`,
    });
  } else {
    check(label, 'Language toggle exists', false);
  }

  // ── 7. Theme toggle works ─────────────────────────────────────────────
  const themeBtn = await page.$('#themeBtn');
  if (themeBtn) {
    await page.click('#themeBtn');
    await page.waitForTimeout(300);
    const isDark = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme') === 'dark'
    );
    await page.click('#themeBtn'); // toggle back
    check(label, 'Theme toggle switches to dark', isDark);
  } else {
    check(label, 'Theme toggle exists', false);
  }

  // ── 8. Sidebar visible on desktop, hidden on mobile ───────────────────
  const sidebar = await page.$('.sidebar');
  if (sidebar) {
    const visible = await sidebar.isVisible();
    if (label === 'mobile' || label === 'tablet') {
      check(label, `Sidebar hidden on ${label}`, !visible);
    } else {
      check(label, `Sidebar visible on ${label}`, visible);
    }
  }

  // ── 9. Status badge shows LIVE/GENERATED ──────────────────────────────
  const statusText = await page.textContent('.status-badge .value');
  check(label, 'Status badge shows GENERATED', statusText?.includes('GENERATED'), {
    detail: statusText,
  });

  // ── 10. Mobile archive select exists ──────────────────────────────────
  if (label === 'mobile') {
    const archiveBar = await page.$('.archive-bar');
    check(label, 'Archive bar visible on mobile', !!archiveBar);
  }

  console.log(`  ── ${label} done ──\n`);
}

function check(label, name, ok, opts = {}) {
  const icon = ok ? '✅' : '❌';
  console.log(`  ${icon} [${label}] ${name}`);
  if (!ok) {
    failed++;
    if (opts.detail) console.log(`       ↳ ${opts.detail}`);
  }
}

run();
