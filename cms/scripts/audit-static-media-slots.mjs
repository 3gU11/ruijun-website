import { readFile } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';

// Reconciliation audit for the frontend's media slots.
//
// For every page it counts the slots the canvas can edit and lists the ones it
// cannot, then cross-references each static slot against the media asset
// registry. That separates two situations an operator cannot tell apart from
// the canvas alone:
//
//   * a placement is registered but nothing is bound -> pure wiring, fixable now
//   * no placement exists                           -> fixed layout, needs a template change
//
// Read-only. Needs a live CMS + website.
const env = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8')).split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/); return match ? [[match[1].trim(), match[2]]] : [];
}));
const cms = 'http://127.0.0.1:8055';
const targets = [
  ['网站主页', '三大特点'],
  ['产品展示', '产品型号、参数与尺寸图'],
  ['视频新闻', '动态新闻标题'],
  ['关于瑞钧', '公司简介'],
  ['先进制造', '02工艺流程画布'],
  ['服务支持', '服务入口']
];

// Registered placements, so a static slot can be classified.
const login = await fetch(`${cms}/auth/login`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
});
const token = (await login.json())?.data?.access_token;
if (!token) throw new Error('Admin login failed');
const assets = (await (await fetch(`${cms}/items/media_assets?limit=300`, { headers: { authorization: `Bearer ${token}` } })).json()).data || [];
const registeredPlacements = new Map();
for (const asset of assets) {
  const key = String(asset.placement_key || '').trim();
  if (!key) continue;
  if (!registeredPlacements.has(key)) registeredPlacements.set(key, []);
  registeredPlacements.get(key).push(asset);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
const gaps = [];
const byDesign = [];
let editableTotal = 0;
try {
  await page.goto(`${cms}/admin/login`);
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));

  for (const [area, entry] of targets) {
    // Reload between targets: an open preview frame does not re-emit its
    // edit-mode attribute, which otherwise looks like a timeout.
    await page.goto(`${cms}/admin/ruijun-content-editor-workbench`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '网站主页', exact: true }).first().waitFor({ timeout: 30000 });
    let entryButton = page.locator('button').filter({ hasText: entry }).first();
    if (!(await entryButton.count())) {
      await page.getByRole('button', { name: area, exact: true }).first().click();
      await page.waitForTimeout(700);
      entryButton = page.locator('button').filter({ hasText: entry }).first();
    }
    if (!(await entryButton.count())) { console.log(JSON.stringify({ area, status: 'entry-missing' })); continue; }
    await entryButton.click();
    await page.waitForTimeout(900);
    await page.locator('button.live-preview-toggle').first().click();
    const frame = page.frameLocator('iframe');
    try {
      await frame.locator('html[data-cms-preview-edit-mode]').first().waitFor({ state: 'attached', timeout: 90000 });
      await page.waitForTimeout(2500);
      const detail = await frame.locator('html').evaluate(() => {
        const all = [...document.querySelectorAll('[data-cms-preview-media-role]')];
        const describe = (node) => ({
          role: node.getAttribute('data-cms-preview-media-role') || '',
          placement: node.getAttribute('data-cms-preview-placement-key') || '',
          section: node.closest('[data-cms-preview-key]')?.getAttribute('data-cms-preview-key') || ''
        });
        return {
          editable: all.filter((node) => node.getAttribute('data-cms-preview-field-path') && !node.getAttribute('data-cms-preview-readonly')).length,
          statics: all.filter((node) => node.getAttribute('data-cms-preview-readonly')).map(describe)
        };
      });
      editableTotal += detail.editable;
      console.log(JSON.stringify({ area, status: 'ok', editable: detail.editable, statics: detail.statics.length }));
      for (const slot of detail.statics) {
        const registered = slot.placement ? (registeredPlacements.get(slot.placement) || []) : [];
        const row = { area, ...slot, registeredAssets: registered.map((asset) => asset.id) };
        if (registered.length) gaps.push(row);
        else byDesign.push(row);
      }
    } catch {
      console.log(JSON.stringify({ area, status: 'preview-timeout' }));
    }
  }
} finally {
  await browser.close();
}

console.log('--- 已登记用途但页面未绑定（可立即修） ---');
gaps.forEach((row) => console.log(JSON.stringify(row)));
console.log('--- 无登记用途（需改模板，或先在媒体资产登记） ---');
byDesign.forEach((row) => console.log(JSON.stringify(row)));
console.log(JSON.stringify({ step: 'summary', editableSlots: editableTotal, wiringGaps: gaps.length, byDesign: byDesign.length }));
