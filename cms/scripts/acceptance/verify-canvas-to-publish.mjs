// Full-flow verification: canvas edit -> submit -> review -> publish -> real site.
// Everything is driven through the UI (no API shortcuts), so this also validates
// the steps written in docs/manual/内容编辑到官网发布-操作教程.md.
// Screenshots are written to docs/assets/canvas-publish-test-2026-10-14/.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../../website/node_modules/playwright/index.mjs';

const env = Object.fromEntries((readFileSync(new URL('../../.env.local', import.meta.url), 'utf8'))
  .split(/\r?\n/).flatMap((l) => { const m = l.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));

const CMS = 'http://127.0.0.1:8055';
const SITE = 'http://127.0.0.1:4175';
// Playwright's screenshot `path` must be a string, not a URL object.
const SHOTS = fileURLToPath(new URL('../../../docs/assets/canvas-publish-test-2026-10-14/', import.meta.url));
mkdirSync(SHOTS, { recursive: true });

const MARKER = `画布发布验证${Date.now().toString(36)}`;
const log = [];
const shots = [];
let shotIndex = 0;

const record = (text) => { log.push(text); console.log(text); };

// --- API helper, used only for setup assertions and the final restore ---
const login = await fetch(`${CMS}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }) });
const auth = await login.json();
const api = { authorization: `Bearer ${auth.data.access_token}`, 'content-type': 'application/json' };
const pageState = async () => (await (await fetch(`${CMS}/items/pages/3?fields=status,publication_state,sections`, { headers: api })).json()).data;
const patch = async (body) => (await fetch(`${CMS}/items/pages/3`, { method: 'PATCH', headers: api, body: JSON.stringify(body) })).status;
const heroBody = async () => (await pageState()).sections.find((s) => s.id === 'hero')?.body;

const ORIGINAL = await heroBody();
record(`原始正文: "${ORIGINAL}"`);
record(`本次标记: "${MARKER}"`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1680, height: 1000 }, deviceScaleFactor: 1 });
page.on('dialog', (d) => d.accept());

const shot = async (name, label) => {
  shotIndex += 1;
  const file = `${String(shotIndex).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: `${SHOTS}${file}`, fullPage: false });
  shots.push({ file, label });
  record(`   [截图] ${file} — ${label}`);
};

const wait = (ms) => page.waitForTimeout(ms);

try {
  // ============ 登录 ============
  await page.goto(`${CMS}/admin/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 60000 });
  record('① 登录 CMS 成功');

  await page.goto(`${CMS}/admin/ruijun-content-editor-workbench`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await wait(9000);

  // ============ 准备：把页面恢复成草稿（走界面） ============
  const before = await pageState();
  record(`② 服务支持页当前状态: ${before.status}/${before.publication_state}`);

  // A PUBLISHED record is not in the 恢复草稿 queue — that queue only holds
  // rejected/unpublished. Published content must be taken offline first, from the
  // publication queue, before it can be restored to a draft.
  if ((await pageState()).publication_state === 'published') {
    await page.goto(`${CMS}/admin/ruijun-content-publication-queue-workbench`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await wait(9000);
    await page.getByRole('button', { name: /已发布/ }).first().click({ timeout: 20000 });
    await wait(5000);
    await shot('01-published-queue', '内容发布队列 / 已发布');
    const pubRow = page.locator('.record-choice, .queue-row, tbody tr').filter({ hasText: '服务支持' }).first();
    if (await pubRow.count()) await pubRow.click({ timeout: 20000 });
    await wait(4000);
    await page.getByRole('button', { name: '下线内容', exact: true }).click({ timeout: 20000 });
    await wait(7000);
    await shot('02-taken-offline', '已下线（published → unpublished）');
    record(`②b 已下线 → 状态 ${(await pageState()).status}/${(await pageState()).publication_state}`);
    await page.goto(`${CMS}/admin/ruijun-content-editor-workbench`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await wait(9000);
  }

  await page.getByRole('button', { name: '内容送审', exact: true }).click({ timeout: 20000 });
  await wait(8000);
  await page.getByRole('button', { name: '恢复草稿', exact: true }).click({ timeout: 20000 });
  await wait(9000);
  await shot('03-recover-queue', '内容送审 / 恢复草稿 列表');

  const restoreRow = page.locator('.record-choice').filter({ hasText: '服务支持' }).first();
  await restoreRow.click({ timeout: 20000 });
  await wait(4000);
  await page.getByRole('button', { name: '恢复为草稿', exact: true }).click({ timeout: 20000 });
  await wait(7000);
  await shot('04-restored-draft', '已恢复为草稿');
  record(`③ 已恢复为草稿 → 状态 ${(await pageState()).status}`);

  // ============ 画布编辑 ============
  await page.getByRole('button', { name: '服务支持', exact: true }).click({ timeout: 20000 });
  await wait(5000);
  await page.getByRole('button', { name: '服务支持首屏', exact: true }).click({ timeout: 20000 });
  await wait(6000);
  await shot('03-section-selected', '选中 服务支持 / 服务支持首屏');

  await page.getByRole('button', { name: '打开实时预览', exact: true }).click({ timeout: 20000 });
  await wait(16000);
  await shot('04-live-preview', '打开实时预览（画布 = 真实官网页面）');
  record('④ 画布已打开');

  // Tool must match the element type.
  await page.locator('.visual-editor-tools button', { hasText: '文字' }).first().click({ timeout: 15000 });
  await wait(1500);
  const modeText = (await page.locator('.visual-mode-button').innerText()).trim();
  record(`⑤ 已选「文字」工具；编辑模式按钮显示「${modeText}」（"编辑中"表示已开启，不要再点）`);

  const frame = page.frames().find((f) => f.url().includes(':4175'));
  if (!frame) throw new Error('未找到官网 iframe');
  const field = frame.locator('[data-cms-preview-field-path="body"]').first();

  await field.click({ timeout: 20000 });
  await wait(3500);
  await shot('05-element-selected', `单击选中元素 → 属性面板打开（选中字段：${(await page.locator('.visual-selected-label').innerText().catch(() => '')).trim()}）`);

  await field.dblclick({ timeout: 20000 });
  await wait(2500);
  await page.keyboard.press('Control+a');
  await page.keyboard.type(MARKER);
  await wait(1500);
  await shot('06-inline-typing', `双击后直接在画布上输入：「${MARKER}」`);

  await page.locator('.visual-editor-brand').first().click({ timeout: 10000 }).catch(() => {});
  await wait(3500);
  const saveBtn = page.locator('.visual-save-button').first();
  const saveDisabled = await saveBtn.isDisabled();
  record(`⑥ 输入后「保存草稿」按钮 disabled=${saveDisabled}`);
  await saveBtn.click({ timeout: 20000 });
  await wait(9000);
  await shot('07-canvas-saved', '画布修改已保存到后台草稿');
  record(`⑦ 画布保存后 CMS 正文 = "${await heroBody()}"`);
  record((await heroBody()) === MARKER ? '   ★ 画布修改已写入 CMS' : '   ✗ 未写入');

  // ============ 送审 ============
  await page.getByRole('button', { name: '内容送审', exact: true }).click({ timeout: 20000 });
  await wait(8000);
  await page.getByRole('button', { name: '提交审核', exact: true }).first().click({ timeout: 20000 });
  await wait(8000);
  const submitRow = page.locator('.record-choice').filter({ hasText: '服务支持' }).first();
  await submitRow.click({ timeout: 20000 });
  await wait(4000);
  await shot('08-submit-queue', '内容送审 / 提交审核 列表');
  await page.getByRole('button', { name: '提交审核', exact: true }).last().click({ timeout: 20000 });
  await wait(7000);
  await shot('09-submitted', '已提交审核');
  record(`⑧ 已提交审核 → 状态 ${(await pageState()).status}`);

  // ============ 审核 ============
  await page.getByRole('button', { name: /高级设置/ }).first().click({ timeout: 20000 });
  await wait(2500);
  await page.getByRole('button', { name: '审核队列', exact: true }).click({ timeout: 20000 });
  await wait(8000);
  await shot('10-review-queue', '高级设置 / 审核队列');
  const reviewRow = page.locator('.record-choice').filter({ hasText: '服务支持' }).first();
  await reviewRow.click({ timeout: 20000 });
  await wait(4000);
  await page.getByRole('button', { name: '批准进入待发布', exact: true }).click({ timeout: 20000 });
  await wait(7000);
  await shot('11-approved', '已批准进入待发布');
  record(`⑨ 已批准 → 状态 ${(await pageState()).status}`);

  // ============ 发布 ============
  await page.goto(`${CMS}/admin/ruijun-content-publication-queue-workbench`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await wait(9000);
  await page.getByRole('button', { name: /待发布/ }).first().click({ timeout: 20000 });
  await wait(5000);
  await shot('12-publish-queue', '内容发布队列 / 待发布');
  const publishRow = page.locator('.record-choice, .queue-row, tbody tr').filter({ hasText: '服务支持' }).first();
  if (await publishRow.count()) await publishRow.click({ timeout: 20000 });
  await wait(4000);
  await page.getByRole('button', { name: '正式发布', exact: true }).click({ timeout: 20000 });
  await wait(8000);
  await shot('13-published', '已正式发布');
  const finalState = await pageState();
  record(`⑩ 已正式发布 → 状态 ${finalState.status}/${finalState.publication_state}`);

  // ============ 验证真实官网 ============
  record('⑪ 等待官网缓存刷新（约 30 秒）...');
  await wait(38000);
  const site = await browser.newPage({ viewport: { width: 1680, height: 1000 } });
  await site.goto(`${SITE}/service`, { waitUntil: 'networkidle', timeout: 60000 });
  await wait(3000);
  const visible = (await site.locator('body').innerText().catch(() => '')).includes(MARKER);
  await site.screenshot({ path: `${SHOTS}14-live-site.png`, fullPage: false });
  shots.push({ file: '14-live-site.png', label: `官网 /service 显示新文案` });
  record(`⑫ 官网 /service 是否显示新文案: ${visible ? '是 ★' : '否 ✗'}`);
  if (visible) {
    const hero = site.locator('h1, h2').filter({ hasText: MARKER }).first();
    await hero.scrollIntoViewIfNeeded().catch(() => {});
    await wait(1200);
    await site.screenshot({ path: `${SHOTS}15-live-site-hero.png` });
    shots.push({ file: '15-live-site-hero.png', label: '官网首屏放大确认' });
  }
  await site.close();

  record('');
  record(`最终结论：画布编辑 → 送审 → 审核 → 发布 → 官网可见 = ${visible ? '全链路成功' : '未闭环'}`);
} catch (error) {
  record('中断: ' + error.message.split('\n')[0].slice(0, 160));
  await shot('99-interrupted', '中断时的界面').catch(() => {});
} finally {
  await browser.close().catch(() => {});

  // ============ 还原 ============
  const st = await pageState();
  if (st.status === 'published') await patch({ status: 'unpublished' });
  if ((await pageState()).status !== 'draft') await patch({ status: 'draft' });
  const sections = (await pageState()).sections;
  await patch({ sections: sections.map((s) => (s.id === 'hero' ? { ...s, body: ORIGINAL } : s)) });
  for (const s of ['review', 'scheduled', 'published']) await patch({ status: s });
  const restored = await pageState();
  record(`[还原] 状态=${restored.status}/${restored.publication_state} 正文="${await heroBody()}" 一致=${(await heroBody()) === ORIGINAL}`);

  writeFileSync(`${SHOTS}result.json`, JSON.stringify({ marker: MARKER, original: ORIGINAL, log, shots }, null, 1), 'utf8');
  console.log('\n留档已写入 docs/assets/canvas-publish-test-2026-10-14/');
}
