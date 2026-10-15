import { readFile } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';

// E2E for the new block types and the contact page adoption:
// confirm the library lists them, the contact page now accepts blocks, and a
// faq block can be filled and saved.
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

  // --- contact page should now accept blocks ---
  await page.getByRole('button', { name: '联系我们', exact: true }).click().catch(async () => {
    await page.getByRole('button', { name: /联系/ }).first().click();
  });
  await page.waitForTimeout(5000);
  const contactAdd = await page.getByRole('button', { name: '添加区块', exact: true }).count();
  step('contact page shows 添加区块', String(contactAdd > 0));
  out.contactAdopted = contactAdd > 0;

  // --- service page: new block types in the library ---
  await page.getByRole('button', { name: '服务支持', exact: true }).click();
  await page.waitForTimeout(4500);
  await page.getByRole('button', { name: '服务支持首屏', exact: true }).click();
  await page.waitForTimeout(6000);

  await page.getByRole('button', { name: '添加区块', exact: true }).first().click();
  await page.waitForTimeout(1200);
  const dialog = page.locator('.section-library[role="dialog"]');
  const entries = (await dialog.locator('.section-library-group button').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim().split('添加')[0]);
  step('library entries', JSON.stringify(entries));
  out.libraryEntries = entries;

  await dialog.locator('.section-library-group button', { hasText: '常见问题' }).first().click();
  await page.waitForTimeout(2500);
  step('faq block added');

  const card = page.locator('article.section-card').last();
  await card.locator('input[maxlength="240"]').first().fill('E2E 常见问题');
  const addItem = card.getByRole('button', { name: '新增一项', exact: true });
  await addItem.click();
  await page.waitForTimeout(900);
  const itemCard = card.locator('.service-item-card').first();
  await itemCard.locator('input[maxlength="240"]').first().fill('E2E 问题一');
  await itemCard.locator('textarea').first().fill('E2E 回答一');
  step('faq item filled');

  await page.locator('button', { hasText: '保存页面草稿' }).first().click();
  await page.waitForTimeout(6000);
  const msgs = await page.locator('.message, .error, [role="alert"], .notice').allTextContents();
  step('save messages', JSON.stringify(msgs.map((m) => m.replace(/\s+/g, ' ').trim().slice(0, 120))));

  await page.screenshot({ path: 'D:/CURSORpj/gaunwang/output/manual-launch/wb-new-types.png', fullPage: false });
} catch (e) {
  out.errors.push(`fatal: ${e.message}`);
  step('FAILED', e.message);
} finally {
  await browser.close();
}
console.log('\n=== RESULT ===');
console.log(JSON.stringify(out, null, 2));
