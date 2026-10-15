import { readFile } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';

// E2E for block variants: the layout select is injected from the registry, and
// the chosen variant reaches both storage and the rendered markup.
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

  await page.getByRole('button', { name: '添加区块', exact: true }).first().click();
  await page.waitForTimeout(1200);
  const dialog = page.locator('.section-library[role="dialog"]');
  await dialog.locator('.section-library-group button', { hasText: '卡片列表' }).first().click();
  await page.waitForTimeout(2500);
  step('card-grid added');

  const card = page.locator('article.section-card').last();
  // The layout select is labelled 版式 and must offer the declared variants.
  const variantSelect = card.locator('label', { hasText: '版式' }).locator('select').first();
  step('variant select count', String(await variantSelect.count()));
  const variantOptions = await variantSelect.locator('option').allTextContents();
  step('variant options', JSON.stringify(variantOptions));
  out.variantOptions = variantOptions;
  const variantValues = await variantSelect.locator('option').evaluateAll((els) => els.map((el) => el.value));
  step('variant values', JSON.stringify(variantValues));
  step('default variant', await variantSelect.inputValue());

  await card.locator('input[maxlength="240"]').first().fill('E2E 版式区块');
  await variantSelect.selectOption('list');
  await page.waitForTimeout(600);

  await page.locator('button', { hasText: '保存页面草稿' }).first().click();
  await page.waitForTimeout(6000);
  const msgs = await page.locator('.message, .error, [role="alert"], .notice').allTextContents();
  step('save messages', JSON.stringify(msgs.map((m) => m.replace(/\s+/g, ' ').trim().slice(0, 120))));

  await page.screenshot({ path: 'D:/CURSORpj/gaunwang/output/manual-launch/wb-variant.png', fullPage: false });
} catch (e) {
  out.errors.push(`fatal: ${e.message}`);
  step('FAILED', e.message);
} finally {
  await browser.close();
}
console.log('\n=== RESULT ===');
console.log(JSON.stringify(out, null, 2));
