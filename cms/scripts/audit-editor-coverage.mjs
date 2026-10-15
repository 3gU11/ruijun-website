import { readFile } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';

// Quantifies editor completeness per page: how many slots the canvas can edit
// versus how many it reports as static/read-only.
const env = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8')).split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/); return match ? [[match[1].trim(), match[2]]] : [];
}));
const cms = 'http://127.0.0.1:8055';
// area -> entry prefix that opens that page's canvas
const targets = [
  ['网站主页', '三大特点'],
  ['产品展示', '产品型号、参数与尺寸图'],
  ['视频新闻', '动态新闻标题'],
  ['关于瑞钧', '公司简介'],
  ['先进制造', '02工艺流程画布'],
  ['服务支持', '服务入口']
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
try {
  await page.goto(`${cms}/admin/login`);
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));
  await page.goto(`${cms}/admin/ruijun-content-editor-workbench`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '网站主页', exact: true }).first().waitFor({ timeout: 30000 });

  for (const [area, entry] of targets) {
    // Reload between targets: an already-open preview frame does not re-emit
    // its edit-mode attribute, which otherwise looks like a timeout.
    await page.goto(`${cms}/admin/ruijun-content-editor-workbench`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '网站主页', exact: true }).first().waitFor({ timeout: 30000 });

    // Try the entry directly first: clicking an area button can reset the panel
    // and hide the entry for the already-active area.
    let entryButton = page.locator('button').filter({ hasText: entry }).first();
    if (!(await entryButton.count())) {
      await page.getByRole('button', { name: area, exact: true }).first().click();
      await page.waitForTimeout(700);
      entryButton = page.locator('button').filter({ hasText: entry }).first();
    }
    if (!(await entryButton.count())) { console.log(JSON.stringify({ area, entry, status: 'entry-missing' })); continue; }
    await entryButton.click();
    await page.waitForTimeout(900);

    const open = page.locator('button.live-preview-toggle').first();
    if (!(await open.count())) { console.log(JSON.stringify({ area, entry, status: 'no-preview-control' })); continue; }
    await open.click({ timeout: 10000 }).catch(() => null);

    const frame = page.frameLocator('iframe');
    try {
      await frame.locator('html[data-cms-preview-edit-mode]').first().waitFor({ state: 'attached', timeout: 90000 });
      await page.waitForTimeout(2200);
      const stats = await frame.locator('html').evaluate(() => ({
        textSlots: document.querySelectorAll('[data-cms-preview-field-path]').length,
        mediaSlots: document.querySelectorAll('[data-cms-preview-media-role]').length,
        mediaEditable: document.querySelectorAll('[data-cms-preview-media-role][data-cms-preview-field-path]:not([data-cms-preview-readonly])').length,
        mediaStatic: document.querySelectorAll('[data-cms-preview-media-role][data-cms-preview-readonly]').length
      }));
      console.log(JSON.stringify({ area, entry, status: 'ok', ...stats }));
    } catch (error) {
      console.log(JSON.stringify({ area, entry, status: 'preview-timeout', detail: String(error.message).slice(0, 50) }));
    }
  }
} finally {
  await browser.close();
}
