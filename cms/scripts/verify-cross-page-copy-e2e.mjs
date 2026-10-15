import { readFile } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';

// E2E for cross-page block reuse: build a block on the service page, copy it,
// switch to the about page, paste it, and confirm it lands as a fresh instance.
const env = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8'))
  .split(/\r?\n/).flatMap((l) => { const m = l.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));

const out = { steps: [], errors: [] };
const step = (n, d = '') => { out.steps.push(`${n}${d ? ' :: ' + d : ''}`); console.log(`[step] ${n}${d ? ' :: ' + d : ''}`); };

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1700, height: 1050 } });
  page.on('pageerror', (e) => out.errors.push(`pageerror: ${e.message}`));
  // Switching site areas asks to discard unsaved changes; Playwright dismisses
  // dialogs by default, which would silently abort the switch.
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto('http://127.0.0.1:8055/admin/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 60000 });
  step('login ok');

  await page.goto('http://127.0.0.1:8055/admin/ruijun-content-editor-workbench', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);

  // --- build a block on the service page ---
  await page.getByRole('button', { name: '服务支持', exact: true }).click();
  await page.waitForTimeout(4500);
  await page.getByRole('button', { name: '服务支持首屏', exact: true }).click();
  await page.waitForTimeout(6000);

  await page.getByRole('button', { name: '添加区块', exact: true }).first().click();
  await page.waitForTimeout(1200);
  await page.locator('.section-library[role="dialog"] .section-library-group button', { hasText: '数据指标' }).first().click();
  await page.waitForTimeout(2500);

  const card = page.locator('article.section-card').last();
  await card.locator('input[maxlength="240"]').first().fill('E2E 跨页指标');
  const addItem = card.getByRole('button', { name: '新增一项', exact: true });
  await addItem.click();
  await page.waitForTimeout(900);
  const firstItem = card.locator('.service-item-card').first();
  await firstItem.locator('input[maxlength="24"]').first().fill('50+');
  await firstItem.locator('input[maxlength="60"]').first().fill('直属办事处');
  step('source block built');

  // --- copy it for reuse ---
  await card.getByRole('button', { name: '复制到其他页', exact: true }).click();
  await page.waitForTimeout(1200);
  const copyMsg = await page.locator('.message').first().textContent().catch(() => '');
  step('copy message', (copyMsg || '').replace(/\s+/g, ' ').trim());

  // Paste must not be offered while still on the source page? It is valid here,
  // so the button should already be present.
  const pasteOnSource = await page.getByRole('button', { name: '粘贴区块', exact: true }).count();
  step('paste button visible after copy', String(pasteOnSource > 0));

  // --- switch to the about page and paste ---
  await page.getByRole('button', { name: '关于瑞钧', exact: true }).click();
  await page.waitForTimeout(5500);
  const areaActive = await page.getByRole('button', { name: '关于瑞钧', exact: true }).evaluate((el) => el.classList.contains('active'));
  step('about area became active', String(areaActive));
  out.switchedToAbout = areaActive;

  // The block editor only renders once a section entry is opened.
  await page.getByRole('button', { name: '关于瑞钧首屏', exact: true }).click();
  await page.waitForTimeout(5500);
  step('about section entry opened');

  const pasteBtn = page.getByRole('button', { name: '粘贴区块', exact: true });
  step('paste button on about', String(await pasteBtn.count()));
  await pasteBtn.first().click();
  await page.waitForTimeout(2500);

  const pastedCard = page.locator('article.section-card').last();
  const pastedTitle = await pastedCard.locator('input[maxlength="240"]').first().inputValue().catch(() => '');
  const pastedValue = await pastedCard.locator('input[maxlength="24"]').first().inputValue().catch(() => '');
  const pastedLabel = await pastedCard.locator('input[maxlength="60"]').first().inputValue().catch(() => '');
  step('pasted content', JSON.stringify({ title: pastedTitle, value: pastedValue, label: pastedLabel }));
  out.pasted = { title: pastedTitle, value: pastedValue, label: pastedLabel };

  await page.locator('button', { hasText: '保存页面草稿' }).first().click();
  await page.waitForTimeout(6000);
  const msgs = await page.locator('.message, .error, [role="alert"], .notice').allTextContents();
  step('save messages', JSON.stringify(msgs.map((m) => m.replace(/\s+/g, ' ').trim().slice(0, 120))));

  await page.screenshot({ path: 'D:/CURSORpj/gaunwang/output/manual-launch/wb-cross-page.png', fullPage: false });
} catch (e) {
  out.errors.push(`fatal: ${e.message}`);
  step('FAILED', e.message);
} finally {
  await browser.close();
}
console.log('\n=== RESULT ===');
console.log(JSON.stringify(out, null, 2));
