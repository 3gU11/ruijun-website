import { readFile } from 'node:fs/promises';
import { chromium } from '../../../website/node_modules/playwright/index.mjs';

// Second pass: the advanced-settings menu and the built-in help text, both of which
// the manual should mirror rather than invent.
const env = Object.fromEntries((await readFile(new URL('../../.env.local', import.meta.url), 'utf8'))
  .split(/\r?\n/).flatMap((l) => { const m = l.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1800, height: 1100 } });
page.on('dialog', (d) => d.accept());

await page.goto('http://127.0.0.1:8055/admin/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
await page.getByRole('button', { name: '登录', exact: true }).click();
await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 60000 });
await page.goto('http://127.0.0.1:8055/admin/ruijun-content-editor-workbench', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(7000);

// --- built-in help text ---
await page.getByRole('button', { name: '查看操作说明', exact: true }).first().click().catch(() => {});
await page.waitForTimeout(2000);
const help = await page.evaluate(() => {
  const root = document.querySelector('[class*="help"], [class*="guide"], aside, .editor-start');
  const text = root ? root.innerText : document.body.innerText;
  return text.replace(/\n{2,}/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 40);
});
console.log('=== 内置操作说明全文 ===');
for (const line of help) console.log('  ' + line.slice(0, 150));

// --- advanced settings menu ---
await page.getByRole('button', { name: /高级设置/ }).first().click().catch(() => {});
await page.waitForTimeout(2500);
const menu = await page.evaluate(() => {
  const items = [...document.querySelectorAll('[role="menu"] button, [role="menuitem"], .advanced-menu button, [class*="menu"] button, [class*="dropdown"] button')];
  return [...new Set(items.map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean))];
});
console.log('\n=== 高级设置菜单 ===');
console.log('  ' + menu.join(' | '));
await page.screenshot({ path: 'D:/CURSORpj/gaunwang/output/manual-shots/90-advanced-menu.png' });

await browser.close();
