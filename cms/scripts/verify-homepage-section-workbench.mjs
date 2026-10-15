import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';

// Read-only browser smoke check. Media save/readback remains a separate gate.
const env = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8'))
  .split(/\r?\n/).flatMap(line => { const match = line.match(/^([^#=]+)=(.*)$/); return match ? [[match[1].trim(), match[2]]] : []; }));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://127.0.0.1:8055/admin/login');
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL(url => !url.pathname.endsWith('/login'));
  await page.goto('http://127.0.0.1:8055/admin/ruijun-content-editor-workbench');
  await page.getByRole('button', { name: '三大特点', exact: true }).click();
  const buttons = page.getByRole('button', { name: /^编辑独立区块：/ });
  console.log(JSON.stringify({ entries: await buttons.allTextContents() }));
  await buttons.nth(Number(process.argv[2] || 0)).click();
  await page.frameLocator('iframe').locator('[data-cms-preview-collection="homepage_sections"]').first().waitFor({ state: 'attached' });
  console.log(JSON.stringify({ independentPreview: true }));
} finally {
  await browser.close();
}
