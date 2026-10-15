import { readFile } from 'node:fs/promises';
import { chromium } from '../../../website/node_modules/playwright/index.mjs';

// 端到端验证：在工作台里真实走一遍「视频新闻 + 视频分享列表 + 竖屏视频」的上传。
// 之前卡在两处：后端的 usage_scope 词表，以及前端 validateMediaCandidate 的尺寸校验。
const env = Object.fromEntries((await readFile(new URL('../../.env.local', import.meta.url), 'utf8'))
  .split(/\r?\n/).flatMap((l) => { const m = l.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));

const VIDEO = 'D:/IE下载/a819864afdba90f345029dda6a041f2f.mp4';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1700, height: 1100 } });
  page.on('dialog', (d) => d.accept());

  await page.goto('http://127.0.0.1:8055/admin/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 60000 });

  await page.goto('http://127.0.0.1:8055/admin/ruijun-content-editor-workbench', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(7000);
  await page.getByRole('button', { name: /高级设置/ }).first().click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: '媒体资产', exact: true }).click();
  await page.waitForTimeout(4000);

  // 选文件
  await page.locator('input[type="file"]').first().setInputFiles(VIDEO);
  await page.waitForTimeout(4000);

  // 使用范围 → 视频新闻
  const scope = page.locator('select').filter({ hasText: '网站主页' }).first();
  await scope.selectOption('article');
  await page.waitForTimeout(2500);

  // 展示位置 → 视频分享列表
  const placement = page.locator('select').filter({ hasText: '视频分享' }).first();
  const hasPlacement = await placement.count();
  if (hasPlacement) {
    const value = await placement.locator('option').filter({ hasText: '视频分享列表' }).first().getAttribute('value').catch(() => null);
    if (value) await placement.selectOption(value);
  }
  await page.waitForTimeout(2500);

  // 界面上的提示文案
  const help = await page.evaluate(() => {
    const el = [...document.querySelectorAll('p, .form-help, .field-help')].find((n) => /建议.*px/.test(n.textContent || ''));
    return el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) : '(未找到)';
  });
  console.log('[提示文案]', help);

  // 点登记
  const submit = page.getByRole('button', { name: /登记|保存/ }).first();
  await submit.click();
  await page.waitForTimeout(7000);

  const outcome = await page.evaluate(() => {
    const err = [...document.querySelectorAll('[class*="error"], .form-error, .alert')].map((n) => (n.textContent || '').trim()).filter(Boolean);
    const ok = [...document.querySelectorAll('[class*="message"], .form-success, [role="status"]')].map((n) => (n.textContent || '').trim()).filter(Boolean);
    return { error: err.slice(0, 2), message: ok.slice(0, 2) };
  });
  console.log('[错误]', outcome.error.length ? outcome.error.join(' | ').slice(0, 220) : '无');
  console.log('[成功]', outcome.message.length ? outcome.message.join(' | ').slice(0, 220) : '无');
  await page.screenshot({ path: 'D:/CURSORpj/gaunwang/output/media-upload-e2e.png' });
} finally {
  await browser.close();
}
