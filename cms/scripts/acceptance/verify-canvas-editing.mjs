// End-to-end proof that canvas (visual) editing works.
//
//   node cms/scripts/acceptance/verify-canvas-editing.mjs
//
// The workbench's canvas IS the live-preview iframe, so this exercises the whole
// visual chain: preview token -> iframe -> field markers -> selection -> inline
// edit -> save -> CMS.
//
// Three things are easy to get wrong and are encoded here:
//   1. Opening the preview ALREADY enables edit mode (startLiveWebsitePreview sets
//      visualEditMode = visualCanvasEditable). Clicking the mode button turns it
//      OFF, after which nothing on the canvas responds at all.
//   2. The tool must match the element type — 文字 for text/buttons, 媒体 for
//      images/video. A mismatch is silently ignored.
//   3. A single click only selects; DOUBLE click is what opens the editor.
//
// The page is restored to its original body text and re-published afterwards.
import { readFileSync } from 'node:fs';
import { chromium } from '../../../website/node_modules/playwright/index.mjs';

const env = Object.fromEntries((readFileSync(new URL('../../.env.local', import.meta.url), 'utf8'))
  .split(/\r?\n/).flatMap((l) => { const m = l.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));

const CMS = 'http://127.0.0.1:8055';
const login = await fetch(`${CMS}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }) });
const auth = await login.json();
const a = { authorization: `Bearer ${auth.data.access_token}`, 'content-type': 'application/json' };
const statusOf = async () => (await (await fetch(`${CMS}/items/pages/3?fields=status`, { headers: a })).json()).data.status;
const patch = async (body) => (await fetch(`${CMS}/items/pages/3`, { method: 'PATCH', headers: a, body: JSON.stringify(body) })).status;
const bodyOf = async () => (await (await fetch(`${CMS}/items/pages/3?fields=sections`, { headers: a })).json()).data.sections.find((s) => s.id === 'hero')?.body;

const ORIGINAL = await bodyOf();
const MARKER = `画布改${Date.now().toString(36)}`;

if (await statusOf() === 'published') await patch({ status: 'unpublished' });
if (await statusOf() !== 'draft') await patch({ status: 'draft' });

const step = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1700, height: 1050 } });
page.on('dialog', (d) => d.accept());

try {
  await page.goto(`${CMS}/admin/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 60000 });

  await page.goto(`${CMS}/admin/ruijun-content-editor-workbench`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(9000);
  await page.getByRole('button', { name: '服务支持', exact: true }).click({ timeout: 15000 });
  await page.waitForTimeout(4500);
  await page.getByRole('button', { name: '服务支持首屏', exact: true }).click({ timeout: 15000 });
  await page.waitForTimeout(6000);
  step.push('① 选中 服务支持 / 服务支持首屏');

  await page.getByRole('button', { name: '打开实时预览', exact: true }).click({ timeout: 15000 });
  await page.waitForTimeout(15000);
  step.push('② 打开实时预览（画布出现）');

  // Opening the preview already enables edit mode (startLiveWebsitePreview sets
  // visualEditMode = visualCanvasEditable). Clicking the mode button here turns it
  // OFF, which is why earlier attempts got no response at all.
  await page.locator('.visual-editor-tools button', { hasText: '文字' }).first().click();
  await page.waitForTimeout(1500);
  const modeText = (await page.locator('.visual-mode-button').innerText()).trim();
  step.push(`③ 选「文字」工具；编辑模式按钮显示"${modeText}"（"编辑中"=已开启，无需再点）`);

  const frame = page.frames().find((f) => f.url().includes(':4175'));
  if (!frame) throw new Error('未找到官网 iframe');

  const fieldSel = '[data-cms-preview-field-path="body"]';
  const count = await frame.locator(fieldSel).count();
  step.push(`④ 画布上 body 字段元素 ${count} 个`);
  if (!count) throw new Error('找不到 body 字段元素');

  // Single click first — expected to only select, not open the editor.
  await frame.locator(fieldSel).first().click({ timeout: 15000 });
  await page.waitForTimeout(3000);
  const afterClick = {
    panel: await page.locator('.visual-property-panel').count(),
    label: (await page.locator('.visual-selected-label').innerText().catch(() => '')).trim()
  };
  step.push(`⑤ 单击后：面板=${afterClick.panel}，选中标签="${afterClick.label}"`);

  // Double click — this is what opens the editor.
  await frame.locator(fieldSel).first().dblclick({ timeout: 15000 });
  await page.waitForTimeout(4000);
  const panelCount = await page.locator('.visual-property-panel').count();
  const label = (await page.locator('.visual-selected-label').innerText().catch(() => '')).trim();
  step.push(`⑥ 双击后：面板=${panelCount}，选中标签="${label}"`);

  const editable = await frame.locator(fieldSel).first().getAttribute('contenteditable').catch(() => null);
  step.push(`   画布元素 contentEditable=${editable}`);

  // Inline path: the double-click made the element contentEditable, so type
  // straight onto the canvas and let blur commit the change.
  const el = frame.locator(fieldSel).first();
  await el.dblclick({ timeout: 15000 });
  await page.waitForTimeout(2000);
  const ce = await el.getAttribute('contenteditable').catch(() => null);
  step.push(`   双击后 contentEditable=${ce}`);
  if (ce === 'true') {
    await page.keyboard.press('Control+a');
    await page.keyboard.type(MARKER);
    await page.waitForTimeout(1200);
    // Blur commits the inline edit.
    await page.locator('.visual-editor-brand').first().click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const save = page.locator('.visual-save-button').first();
    const saveDisabled = await save.isDisabled();
    step.push(`⑦ 内联输入后 保存按钮 disabled=${saveDisabled}`);
    if (!saveDisabled) {
      await save.click({ timeout: 15000 });
      await page.waitForTimeout(8000);
    }
    const now = await bodyOf();
    step.push(`⑧ 保存后 CMS hero.body="${now}"`);
    step.push(now === MARKER ? '★ 画布内联修改已写入 CMS' : '★ 未写入');
  }
} catch (error) {
  step.push('中断: ' + error.message.split('\n')[0].slice(0, 120));
} finally {
  await browser.close().catch(() => {});
  console.log('\n=== 画布编辑实测 ===');
  for (const s of step) console.log('  ' + s);
  await patch({ status: 'unpublished' });
  await patch({ status: 'draft' });
  const sections = (await (await fetch(`${CMS}/items/pages/3?fields=sections`, { headers: a })).json()).data.sections;
  await patch({ sections: sections.map((s) => (s.id === 'hero' ? { ...s, body: ORIGINAL } : s)) });
  for (const s of ['review', 'scheduled', 'published']) await patch({ status: s });
  console.log(`\n[还原] 状态=${await statusOf()} 正文="${await bodyOf()}" 一致=${(await bodyOf()) === ORIGINAL}`);
}
