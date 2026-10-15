import { readFile } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';

// E2E for the dynamic data-list block: add it from the library, confirm the
// select/number controls are schema-driven, save, then verify the stored values.
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
  await page.waitForTimeout(4500);
  await page.getByRole('button', { name: '服务支持首屏', exact: true }).click();
  await page.waitForTimeout(6000);
  step('service editor open');

  // The library should now carry a 动态内容 category.
  await page.getByRole('button', { name: '添加区块', exact: true }).first().click();
  await page.waitForTimeout(1200);
  const dialog = page.locator('.section-library[role="dialog"]');
  const categories = await dialog.locator('.section-library-group h4').allTextContents();
  step('library categories', JSON.stringify(categories));
  out.categories = categories;

  const dataListButton = dialog.locator('.section-library-group button', { hasText: '数据列表' }).first();
  step('data-list entry present', String((await dataListButton.count()) > 0));
  await dataListButton.click();
  await page.waitForTimeout(2500);
  step('library closed after add', String((await dialog.count()) === 0));

  // The new block is the only visible card; inspect its schema-driven controls.
  const card = page.locator('article.section-card').last();
  const selects = card.locator('label select');
  const numbers = card.locator('label input[type="number"]');
  step('select control count', String(await selects.count()));
  step('number control count', String(await numbers.count()));
  const sourceOptions = await selects.first().locator('option').allTextContents();
  step('source options', JSON.stringify(sourceOptions));
  out.sourceOptions = sourceOptions;
  const limits = await numbers.evaluateAll((els) => els.map((el) => `${el.min}-${el.max}`));
  step('number ranges', JSON.stringify(limits));
  out.numberRanges = limits;

  // Fill and save.
  await card.locator('input[maxlength="240"]').first().fill('E2E 动态列表');
  await selects.first().selectOption({ label: '新闻文章' });
  await numbers.nth(0).fill('4');
  await numbers.nth(1).fill('2');
  await page.waitForTimeout(600);

  await page.locator('button', { hasText: '保存页面草稿' }).first().click();
  await page.waitForTimeout(6000);
  const msgs = await page.locator('.message, .error, [role="alert"], .notice').allTextContents();
  step('save messages', JSON.stringify(msgs.map((m) => m.replace(/\s+/g, ' ').trim().slice(0, 120))));

  await page.screenshot({ path: 'D:/CURSORpj/gaunwang/output/manual-launch/wb-data-list.png', fullPage: false });
} catch (e) {
  out.errors.push(`fatal: ${e.message}`);
  step('FAILED', e.message);
} finally {
  await browser.close();
}
console.log('\n=== RESULT ===');
console.log(JSON.stringify(out, null, 2));
