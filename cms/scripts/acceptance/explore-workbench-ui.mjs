import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from '../../../website/node_modules/playwright/index.mjs';

// Captures the workbench UI so the operator manual describes what is actually on
// screen, not what the code appears to do.
const env = Object.fromEntries((await readFile(new URL('../../.env.local', import.meta.url), 'utf8'))
  .split(/\r?\n/).flatMap((l) => { const m = l.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));

const CMS = 'http://127.0.0.1:8055';
const OUT = 'D:/CURSORpj/gaunwang/output/manual-shots';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1800, height: 1100 } });
page.on('dialog', (d) => d.accept());

await page.goto(`${CMS}/admin/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
await page.getByRole('button', { name: '登录', exact: true }).click();
await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 60000 });

await page.goto(`${CMS}/admin/ruijun-content-editor-workbench`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(7000);

// The top-level navigation: what can the operator switch between?
const nav = await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('nav button, [role="tab"], .workspace-nav button, header button')];
  return [...new Set(buttons.map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean))];
});
console.log('=== 顶部导航 ===');
console.log(nav.join(' | '));

await page.screenshot({ path: `${OUT}/00-landing.png` });

// Walk the navigation and record what each screen offers.
for (const label of nav) {
  try {
    const target = page.getByRole('button', { name: label, exact: true }).first();
    if (!(await target.count())) continue;
    await target.click();
    await page.waitForTimeout(3500);
    const info = await page.evaluate(() => {
      const headings = [...document.querySelectorAll('h1,h2,h3')].map((h) => (h.textContent || '').trim()).filter(Boolean).slice(0, 8);
      const actions = [...document.querySelectorAll('main button, .workspace-grid button, section button')]
        .map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 22);
      const notes = [...document.querySelectorAll('.form-help, .read-only-note, p')].map((p) => (p.textContent || '').replace(/\s+/g, ' ').trim()).filter((t) => t.length > 12).slice(0, 5);
      return { headings, actions: [...new Set(actions)], notes };
    });
    console.log(`\n=== ${label} ===`);
    console.log('  标题:', info.headings.join(' / '));
    console.log('  按钮:', info.actions.join(' | '));
    if (info.notes.length) console.log('  说明:', info.notes.join(' // ').slice(0, 400));
    const slug = label.replace(/[^\w\u4e00-\u9fa5]+/g, '-').slice(0, 20);
    await page.screenshot({ path: `${OUT}/${slug}.png` });
  } catch (error) {
    console.log(`\n=== ${label} === 跳过：${error.message.slice(0, 80)}`);
  }
}

await browser.close();
console.log(`\n截图目录: ${OUT}`);
