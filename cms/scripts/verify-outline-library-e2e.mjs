import { readFile } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';

// E2E for the P2 closing features: full-page outline navigation and the
// categorized section library. Nothing is saved, so no data is left behind.
const env = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8'))
  .split(/\r?\n/).flatMap((l) => { const m = l.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));

const out = { steps: [], errors: [] };
const step = (n, d = '') => { out.steps.push(`${n}${d ? ' :: ' + d : ''}`); console.log(`[step] ${n}${d ? ' :: ' + d : ''}`); };

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1700, height: 1050 } });
  page.on('pageerror', (e) => out.errors.push(`pageerror: ${e.message}`));

  await page.goto('http://127.0.0.1:8055/admin/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 60000 });
  step('login ok');

  await page.goto('http://127.0.0.1:8055/admin/ruijun-content-editor-workbench', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  await page.getByRole('button', { name: '服务支持', exact: true }).click();
  await page.waitForTimeout(5000);
  await page.getByRole('button', { name: '服务支持首屏', exact: true }).click();
  await page.waitForTimeout(6000);
  step('service page selected');

  // --- outline ---
  const outline = page.locator('.section-outline');
  step('outline present', String((await outline.count()) > 0));
  const outlineItems = outline.locator('ol > li');
  const outlineCount = await outlineItems.count();
  step('outline item count', String(outlineCount));
  out.outlineCount = outlineCount;
  const outlineTexts = await outlineItems.allTextContents();
  out.outlineTexts = outlineTexts.map((t) => t.replace(/\s+/g, ' ').trim()).slice(0, 10);
  step('outline entries', JSON.stringify(out.outlineTexts));

  // Clicking an outline entry reveals and focuses that section.
  if (outlineCount > 1) {
    await outlineItems.nth(1).locator('button').click();
    await page.waitForTimeout(1800);
    const cards = await page.locator('article.section-card').count();
    step('cards visible after outline jump', String(cards));
    out.cardsAfterJump = cards;
    const focused = await page.locator('article.section-card[data-section-key]').first().getAttribute('data-section-key');
    step('first card key after jump', String(focused));
  }

  // --- section library ---
  await page.getByRole('button', { name: '添加区块', exact: true }).first().click();
  await page.waitForTimeout(1200);
  const dialog = page.locator('.section-library[role="dialog"]');
  step('library dialog open', String((await dialog.count()) > 0));
  const groups = await dialog.locator('.section-library-group h4').allTextContents();
  step('library categories', JSON.stringify(groups));
  out.libraryCategories = groups;
  const entries = await dialog.locator('.section-library-group button').allTextContents();
  out.libraryEntries = entries.map((t) => t.replace(/\s+/g, ' ').trim());
  step('library entries', JSON.stringify(out.libraryEntries));

  // Pick a type from the library and confirm it lands in the draft.
  const before = await page.locator('article.section-card').count();
  await dialog.locator('.section-library-group button').first().click();
  await page.waitForTimeout(2500);
  step('library dialog closed after add', String((await page.locator('.section-library[role="dialog"]').count()) === 0));
  const outlineAfter = await page.locator('.section-outline ol > li').count();
  step('outline count after add', `${outlineCount} -> ${outlineAfter}`);
  out.outlineCountAfterAdd = outlineAfter;

  await page.screenshot({ path: 'D:/CURSORpj/gaunwang/output/manual-launch/wb-outline-library.png', fullPage: false });
} catch (e) {
  out.errors.push(`fatal: ${e.message}`);
  step('FAILED', e.message);
} finally {
  await browser.close();
}
console.log('\n=== RESULT ===');
console.log(JSON.stringify(out, null, 2));
