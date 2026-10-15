import { readFile } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';

// E2E for the two new registry block types: add image + card-grid through the
// real workbench, fill their schema-driven fields, save the draft.
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
  step('entered service editor');

  const picker = page.locator('select').filter({ has: page.locator('option', { hasText: '图片区块' }) }).first();
  const options = await picker.locator('option').allTextContents();
  step('picker options', JSON.stringify(options));
  out.pickerOptions = options;

  const addBtn = page.getByRole('button', { name: '添加区块', exact: true }).first();

  // --- image block ---
  await picker.selectOption({ label: '图片区块' });
  await page.waitForTimeout(500);
  await addBtn.click();
  await page.waitForTimeout(2500);
  const card = page.locator('article.section-card').last();
  const labels = await card.locator('label').allTextContents();
  step('image block labels', JSON.stringify(labels.map((t) => t.replace(/\s+/g, ' ').trim()).slice(0, 6)));
  out.imageLabels = labels.map((t) => t.replace(/\s+/g, ' ').trim());

  await card.locator('input[maxlength="240"]').first().fill('E2E 图片区块标题');
  await card.locator('textarea[maxlength="2000"]').first().fill('E2E 图片区块说明');
  const mediaSection = card.locator('.media-reference-editor');
  step('image media picker present', String((await mediaSection.count()) > 0));
  step('image media cap shown', await mediaSection.locator('.section-card-heading span').first().textContent().catch(() => ''));
  out.imageHasMediaPicker = (await mediaSection.count()) > 0;

  // --- card-grid block ---
  await picker.selectOption({ label: '卡片列表' });
  await page.waitForTimeout(500);
  await addBtn.click();
  await page.waitForTimeout(2500);
  const gridCard = page.locator('article.section-card').last();
  const gridLabels = await gridCard.locator('label').allTextContents();
  step('card-grid labels', JSON.stringify(gridLabels.map((t) => t.replace(/\s+/g, ' ').trim()).slice(0, 6)));
  out.gridLabels = gridLabels.map((t) => t.replace(/\s+/g, ' ').trim());

  await gridCard.locator('input[maxlength="240"]').first().fill('E2E 卡片列表标题');
  const addItem = gridCard.getByRole('button', { name: '新增一项', exact: true });
  step('add-item button count', String(await addItem.count()));
  await addItem.click();
  await page.waitForTimeout(900);
  await addItem.click();
  await page.waitForTimeout(900);
  const itemCards = gridCard.locator('.service-item-card');
  step('item count after two adds', String(await itemCards.count()));
  out.itemCount = await itemCards.count();

  const firstItem = itemCards.first();
  await firstItem.locator('input[maxlength="240"]').first().fill('E2E 卡片一');
  await firstItem.locator('textarea[maxlength="2000"]').first().fill('E2E 卡片一说明');
  await firstItem.locator('input[maxlength="60"]').first().fill('card-1');

  // --- save ---
  const save = page.locator('button', { hasText: '保存页面草稿' }).first();
  step('save button count', String(await save.count()));
  await save.click();
  await page.waitForTimeout(6000);
  const msgs = await page.locator('.message, .error, [role="alert"], .notice').allTextContents();
  step('save messages', JSON.stringify(msgs.map((m) => m.replace(/\s+/g, ' ').trim().slice(0, 120))));
  out.saveMessages = msgs.map((m) => m.replace(/\s+/g, ' ').trim().slice(0, 120));

  await page.screenshot({ path: 'D:/CURSORpj/gaunwang/output/manual-launch/wb-new-blocks.png', fullPage: false });
} catch (e) {
  out.errors.push(`fatal: ${e.message}`);
  step('FAILED', e.message);
} finally {
  await browser.close();
}
console.log('\n=== RESULT ===');
console.log(JSON.stringify(out, null, 2));
