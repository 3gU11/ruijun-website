// End-to-end proof of the write direction: edit in the CMS workbench UI, walk the
// real publication state machine, and verify the change lands on the Nuxt site.
//
//   node cms/scripts/acceptance/verify-cms-to-nuxt-e2e.mjs
//
// Why this exists separately from run.mjs: the acceptance suite proves the site
// *reads* published content correctly, but it never writes anything. This is the
// only check that exercises the operator's actual loop — type into the workbench
// form, submit, approve, publish — and confirms the result is visible to a
// visitor. It also carries a negative control: while the page is a draft the
// public API must return null and the marker must not appear anywhere.
//
// The edit is typed into the real workbench form by a browser. The transitions are
// issued the same way the workbench itself issues them (PATCH status=, which is
// what submitForReview / decideReview / runTransition call) because they are
// gated by role rather than by UI.
//
// Everything it touches is restored: the section text is written back, the page is
// re-published, and the throwaway editor account is deleted.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '../../../website/node_modules/playwright/index.mjs';

const cmsEnv = Object.fromEntries((readFileSync(new URL('../../.env.local', import.meta.url), 'utf8'))
  .split(/\r?\n/).flatMap((l) => { const m = l.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));
const siteEnv = Object.fromEntries((readFileSync(new URL('../../../website/.env.local', import.meta.url), 'utf8'))
  .split(/\r?\n/).flatMap((l) => { const m = l.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));

const CMS = 'http://127.0.0.1:8055';
const SITE = 'http://127.0.0.1:4175';
const EDITOR_ROLE = '33737f0e-1648-4644-8fc4-3dcea6f3b341'; // 内容编辑
const PAGE_ID = 3;
const PAGE_SLUG = 'service';
const SECTION_ID = 'hero';
const SECTION_LABEL = '服务支持首屏';
const PAGE_LABEL = '服务支持';
const BFF = siteEnv.NUXT_CMS_BFF_TOKEN || '';
const CACHE_WAIT_MS = 35_000; // public content cache TTL is 30s

const steps = [];
const failures = [];
const note = (s) => { steps.push(s); console.log(`[step] ${s}`); };
const fail = (s) => { failures.push(s); steps.push(`FAIL ${s}`); console.log(`[FAIL] ${s}`); };

async function token(email, password) {
  const r = await fetch(`${CMS}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
  return (await r.json())?.data?.access_token || null;
}
async function api(t, path, init = {}) {
  const r = await fetch(`${CMS}${path}`, { ...init, headers: { 'content-type': 'application/json', authorization: `Bearer ${t}`, ...(init.headers || {}) } });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const readSections = async (t) => (await api(t, `/items/pages/${PAGE_ID}?fields=sections`)).body.data?.sections || [];
const sectionBody = (sections) => (sections || []).find((s) => String(s.id) === SECTION_ID)?.body;
const publicPage = async () => (await (await fetch(`${SITE}/api/public/v1/pages/${PAGE_SLUG}`, { headers: BFF ? { authorization: `Bearer ${BFF}` } : {} })).json())?.data;
const siteHtml = async () => (await fetch(`${SITE}/${PAGE_SLUG}`, { signal: AbortSignal.timeout(40000) })).text();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A failed login or a page that cannot be driven means the run is meaningless;
// bailing out loudly beats reporting a green result that proved nothing.
async function requireStatus(result, label) {
  if (result.status !== 200) throw new Error(`${label} failed: ${result.status} ${JSON.stringify(result.body).slice(0, 200)}`);
}

const admin = await token(cmsEnv.ADMIN_EMAIL, cmsEnv.ADMIN_PASSWORD);
if (!admin) { console.log('管理员登录失败'); process.exit(1); }

const originalSections = await readSections(admin);
const originalBody = sectionBody(originalSections);
if (!originalBody) { console.log(`未找到 ${PAGE_SLUG}/${SECTION_ID} 的正文，无法执行闭环`); process.exit(1); }
note(`原始 ${SECTION_ID}.body = "${originalBody}"`);

const MARKER = `联调标记E2E${Date.now().toString(36)}`;

// Two ways to run. The default exercises the designed separation of duties — a
// 内容编辑 account edits and submits, the administrator approves and publishes.
// `--admin-only` walks the whole chain on the administrator account alone, which
// is the shape of a single-account deployment and the flow the operator guide
// documents.
const adminOnly = process.argv.includes('--admin-only');
const editorEmail = adminOnly ? cmsEnv.ADMIN_EMAIL : `e2e-editor-${Date.now().toString(36)}@example.com`;
const editorPassword = adminOnly ? cmsEnv.ADMIN_PASSWORD : 'Accept-E2E-123456!';
let editorId = null;
let editorToken = adminOnly ? admin : null;
let browser = null;
note(adminOnly ? '模式 = 仅管理员账号（单账号部署）' : '模式 = 编辑 + 管理员（职责分离）');

try {
  // 1. Reach an editable state: published content must come down before it can be
  //    reopened, and only the administrator may take it down.
  const start = (await api(admin, `/items/pages/${PAGE_ID}?fields=status`)).body.data?.status;
  note(`起始状态 = ${start}`);
  if (start === 'published') {
    await requireStatus(await api(admin, `/items/pages/${PAGE_ID}`, { method: 'PATCH', body: JSON.stringify({ status: 'unpublished', review_note: '联调自检：临时下线' }) }), 'published -> unpublished');
    note('published -> unpublished ✓');
  } else if (start !== 'draft' && start !== 'unpublished') {
    // scheduled / archived have no route back through this workflow.
    throw new Error(`起始状态 ${start} 无法回到可编辑状态，请先手工处理`);
  }

  if (!adminOnly) {
    const provision = await api(admin, '/users', { method: 'POST', body: JSON.stringify({ email: editorEmail, password: editorPassword, role: EDITOR_ROLE, first_name: 'E2E', last_name: 'Editor', status: 'active' }) });
    editorId = provision.body?.data?.id;
    if (!editorId) throw new Error(`临时编辑账号创建失败: ${JSON.stringify(provision.body).slice(0, 200)}`);
    editorToken = await token(editorEmail, editorPassword);
    if (!editorToken) throw new Error('临时编辑账号登录失败');
  }

  const current = (await api(admin, `/items/pages/${PAGE_ID}?fields=status`)).body.data?.status;
  if (current !== 'draft') {
    await requireStatus(await api(editorToken, `/items/pages/${PAGE_ID}`, { method: 'PATCH', body: JSON.stringify({ status: 'draft', review_note: '联调自检：恢复草稿' }) }), 'unpublished -> draft');
    note('unpublished -> draft ✓');
  }

  // 2. Type the edit into the real workbench form.
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1700, height: 1050 } });
  await page.goto(`${CMS}/admin/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(editorEmail);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(editorPassword);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 60000 });

  await page.goto(`${CMS}/admin/ruijun-content-editor-workbench`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  await page.getByRole('button', { name: PAGE_LABEL, exact: true }).click();
  await page.waitForTimeout(4500);
  await page.getByRole('button', { name: SECTION_LABEL, exact: true }).click();
  await page.waitForTimeout(6000);
  note('工作台已打开页面/区块');

  const bodyField = page.locator('label', { hasText: '正文' }).locator('textarea').first();
  if (!(await bodyField.count())) throw new Error('未找到「正文」输入框，工作台结构可能已变化');
  await bodyField.click();
  await bodyField.press('Control+a');
  await bodyField.fill(MARKER);
  await page.waitForTimeout(400);
  note(`已在「正文」输入标记 "${MARKER}"`);

  await page.getByRole('button', { name: '保存页面草稿' }).first().click();
  await page.waitForTimeout(6000);

  // Surface the workbench's own complaint instead of reporting a bare mismatch.
  const messages = (await page.locator('.message, .error, [role="alert"], .form-error').allTextContents().catch(() => []))
    .map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (messages.length) note(`工作台提示: ${messages.slice(0, 3).join(' | ')}`);

  const savedBody = sectionBody(await readSections(editorToken));
  if (savedBody === MARKER) note('UI 保存已写入 CMS ✓');
  else fail(`UI 保存未写入 CMS（当前 "${savedBody}"）${messages.length ? ' — 工作台提示: ' + messages.join(' | ') : ''}`);

  // 3. Negative control: a draft must not be public, in the API or the HTML.
  const draftApi = await publicPage();
  const draftHtml = await siteHtml();
  if (draftApi) fail('草稿态公开接口返回了数据，草稿可能泄漏');
  else note('草稿态公开接口返回 null（静态兜底）✓');
  if (draftHtml.includes(MARKER)) fail('草稿态官网已含标记，草稿泄漏到访客');
  else note('草稿态官网不含标记 ✓');

  // 4. Walk the state machine.
  await requireStatus(await api(editorToken, `/items/pages/${PAGE_ID}`, { method: 'PATCH', body: JSON.stringify({ status: 'review', review_note: '联调自检：提交审核' }) }), 'draft -> review');
  note('draft -> review ✓');
  await requireStatus(await api(admin, `/items/pages/${PAGE_ID}`, { method: 'PATCH', body: JSON.stringify({ status: 'scheduled' }) }), 'review -> scheduled');
  note('review -> scheduled ✓');
  await requireStatus(await api(admin, `/items/pages/${PAGE_ID}`, { method: 'PATCH', body: JSON.stringify({ status: 'published' }) }), 'scheduled -> published');
  note('scheduled -> published ✓');

  // 5. Positive: the change must reach a visitor.
  await sleep(CACHE_WAIT_MS);
  const liveApi = await publicPage();
  const liveBody = liveApi?.sections?.find((s) => String(s.id) === SECTION_ID)?.body;
  if (liveBody === MARKER) note('公开接口已返回新文案 ✓');
  else fail(`公开接口未返回新文案（当前 "${liveBody}"）`);
  const liveHtml = await siteHtml();
  if (liveHtml.includes(MARKER)) note('官网 HTML 已渲染新文案 ✓');
  else fail('官网 HTML 未渲染新文案，内容没有落地到 Nuxt 页面');

  await browser.close();
  browser = null;

  // 6. Restore, then re-publish and confirm the marker is gone.
  await requireStatus(await api(admin, `/items/pages/${PAGE_ID}`, { method: 'PATCH', body: JSON.stringify({ status: 'unpublished', review_note: '联调自检：还原' }) }), 'published -> unpublished (还原)');
  await requireStatus(await api(editorToken, `/items/pages/${PAGE_ID}`, { method: 'PATCH', body: JSON.stringify({ status: 'draft' }) }), 'unpublished -> draft (还原)');
  const restored = (await readSections(editorToken)).map((s) => (String(s.id) === SECTION_ID ? { ...s, body: originalBody } : s));
  await requireStatus(await api(editorToken, `/items/pages/${PAGE_ID}`, { method: 'PATCH', body: JSON.stringify({ sections: restored }) }), '还原 sections');
  for (const status of ['review', 'scheduled', 'published']) {
    await requireStatus(await api(admin, `/items/pages/${PAGE_ID}`, { method: 'PATCH', body: JSON.stringify({ status }) }), `还原 ${status}`);
  }
  const restoredBody = sectionBody(await readSections(admin));
  if (restoredBody === originalBody) note('原文案已写回 ✓');
  else fail(`原文案未写回（当前 "${restoredBody}"）`);

  await sleep(CACHE_WAIT_MS);
  const finalHtml = await siteHtml();
  if (finalHtml.includes(MARKER)) fail('还原后官网仍含标记');
  else note('还原后官网标记已清除 ✓');
  if (finalHtml.includes(originalBody)) note('还原后官网显示原文案 ✓');
  else fail('还原后官网未显示原文案');
} catch (error) {
  fail(`执行中断: ${error.message}`);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (editorId) await api(admin, `/users/${editorId}`, { method: 'DELETE' }).catch(() => {});
  const logPath = new URL('../../../output/manual-launch/e2e-cms-to-nuxt.log', import.meta.url);
  writeFileSync(logPath, steps.join('\n') + '\n', 'utf8');
  console.log(`\n${'='.repeat(60)}`);
  console.log(failures.length === 0 ? `ALL PASS — ${steps.length} 步` : `${failures.length} FAILED`);
  if (failures.length) {
    console.log('\n失败项：');
    for (const f of failures) console.log(`  ${f}`);
  }
  console.log(`日志: ${logPath.pathname.replace(/^\//, '')}`);
  process.exit(failures.length ? 1 : 0);
}
