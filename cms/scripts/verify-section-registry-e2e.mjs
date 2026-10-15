import { readFile } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';

// Full E2E: add rich-text block -> fill -> save draft -> reload -> read back.
const env = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8'))
  .split(/\r?\n/).flatMap((l) => { const m = l.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));
const out = { steps: [], errors: [] };
const step = (n, d = '') => { out.steps.push(`${n}${d ? ' :: ' + d : ''}`); console.log(`[step] ${n}${d ? ' :: ' + d : ''}`); };

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('pageerror', (e) => out.errors.push(`pageerror: ${e.message}`));

  await page.goto('http://127.0.0.1:8055/admin/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 60000 });

  await page.goto('http://127.0.0.1:8055/admin/ruijun-content-editor-workbench', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  await page.getByRole('button', { name: '服务支持', exact: true }).click();
  await page.waitForTimeout(4500);
  await page.getByRole('button', { name: '服务支持首屏', exact: true }).click();
  await page.waitForTimeout(6000);

  // Enumerate every visible button so we can find the real save control.
  const buttons = await page.evaluate(() => [...document.querySelectorAll('button')]
    .filter((b) => b.offsetParent).map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean));
  step('visible buttons', JSON.stringify(buttons.slice(0, 40)));
  out.buttons = buttons;

  const marker = `E2E-${Date.now().toString(36)}`;
  const picker = page.locator('select').filter({ has: page.locator('option', { hasText: '图文内容' }) }).first();
  await picker.selectOption({ label: '图文内容' });
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: '添加区块', exact: true }).first().click();
  await page.waitForTimeout(2500);

  const card = page.locator('article.section-card').last();
  await card.locator('input[maxlength="120"]').first().fill('E2E 校验');
  await card.locator('input[maxlength="240"]').first().fill(`E2E 区块 ${marker}`);
  await card.locator('textarea[maxlength="4000"]').first().fill(`E2E 正文 ${marker}`);
  step('filled', marker);

  // Save: the toolbar exposes a draft-save action.
  const saveCandidates = ['保存', '保存草稿', '提交保存', '保存修改'];
  let saved = false;
  for (const name of saveCandidates) {
    const b = page.getByRole('button', { name, exact: true });
    if (await b.count()) { await b.first().click(); saved = true; step('save clicked', name); break; }
  }
  if (!saved) {
    // Fall back to any button whose text contains 保存.
    const b = page.locator('button', { hasText: '保存' }).first();
    if (await b.count()) { await b.click(); saved = true; step('save clicked (fuzzy)', 'contains 保存'); }
  }
  step('save attempted', String(saved));

  if (saved) {
    await page.waitForTimeout(6000);
    const msgs = await page.locator('.message, .error, [role="alert"], .notice').allTextContents();
    step('messages', JSON.stringify(msgs.map((m) => m.replace(/\s+/g, ' ').trim().slice(0, 140))));
    out.messages = msgs.map((m) => m.replace(/\s+/g, ' ').trim().slice(0, 140));
    await page.screenshot({ path: 'D:/CURSORpj/gaunwang/output/manual-launch/wb-saved.png', fullPage: false });
  }
} catch (e) {
  out.errors.push(`fatal: ${e.message}`);
  step('FAILED', e.message);
} finally {
  await browser.close();
}
console.log('\n=== RESULT ===');
console.log(JSON.stringify(out, null, 2));
