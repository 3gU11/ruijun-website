import { readFile } from 'node:fs/promises';
import { chromium } from '../../../website/node_modules/playwright/index.mjs';

// Operator walkthrough — exercises the flow the way a real editor would.
//
// Question it answers: when does the live canvas reflect an edit? Structural
// changes (adding a block) may need a save, while field edits may be live. This
// records what actually happens rather than assuming.
//
// It saves once, then restores the page through the API, so the CMS is left clean.
const env = Object.fromEntries((await readFile(new URL('../../.env.local', import.meta.url), 'utf8'))
  .split(/\r?\n/).flatMap((l) => { const m = l.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));

const CMS = 'http://127.0.0.1:8055';
const PAGE_ID = '3'; // service
const out = { steps: [], friction: [], errors: [] };
const step = (n, d = '') => { out.steps.push(`${n}${d ? ' :: ' + d : ''}`); console.log(`[step] ${n}${d ? ' :: ' + d : ''}`); };
const friction = (n) => { out.friction.push(n); console.log(`[friction] ${n}`); };

// Snapshot the page so the walkthrough can restore it exactly.
const login = await fetch(`${CMS}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
});
const token = (await login.json()).data.access_token;
const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
const original = (await (await fetch(`${CMS}/items/pages/${PAGE_ID}?fields=id,sections`, { headers: auth })).json()).data;

const marker = `走查-${Date.now().toString(36)}`;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1800, height: 1100 } });
  page.on('pageerror', (e) => out.errors.push(`pageerror: ${e.message}`));
  page.on('dialog', (d) => d.accept());
  // SSR renders the block but the client does not, which smells like a hydration
  // mismatch. Vue logs those, so capture them.
  out.hydrationLogs = [];
  page.on('console', (m) => {
    const text = m.text();
    if (/hydrat|mismatch|Suspense|async setup|Failed to resolve/i.test(text)) out.hydrationLogs.push(text.slice(0, 400));
  });

  await page.goto(`${CMS}/admin/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 60000 });
  step('登录');

  await page.goto(`${CMS}/admin/ruijun-content-editor-workbench`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  await page.getByRole('button', { name: '服务支持', exact: true }).click();
  await page.waitForTimeout(4500);
  await page.getByRole('button', { name: '服务支持首屏', exact: true }).click();
  await page.waitForTimeout(6000);
  step('打开栏目');

  const openPreview = page.getByRole('button', { name: '打开实时预览', exact: true });
  if (await openPreview.count()) await openPreview.first().click();
  else friction('找不到「打开实时预览」按钮');
  await page.waitForTimeout(9000);

  const frame = page.frameLocator('iframe[name="ruijun-live-website-preview"]');
  step('画布 iframe 可用', String((await frame.locator('body').count().catch(() => 0)) > 0));

  const frameEl = page.locator('iframe[name="ruijun-live-website-preview"]');
  out.frameSrc = await frameEl.getAttribute('src').catch(() => null);
  out.frameUrl = page.frames().find((f) => f.name() === 'ruijun-live-website-preview')?.url() || null;
  step('画布 iframe src', String(out.frameSrc));
  step('画布 iframe URL', String(out.frameUrl));

  // Ask the canvas what preview session IT sees — the decisive question is
  // whether the draft reaches the iframe at all.
  out.sessionFromCanvas = await frame.locator('body').evaluate(async () => {
    try {
      const res = await fetch('/api/preview/session', { credentials: 'include' });
      const json = await res.json();
      const preview = json?.data?.preview || null;
      return {
        status: res.status,
        collection: json?.data?.collection ?? null,
        itemId: json?.data?.itemId ?? null,
        slug: preview?.slug ?? null,
        sectionCount: Array.isArray(preview?.sections) ? preview.sections.length : null,
        sectionTypes: Array.isArray(preview?.sections) ? preview.sections.map((s) => s?.type || 'legacy') : null
      };
    } catch (error) {
      return { error: String(error) };
    }
  }).catch((error) => ({ error: String(error) }));
  step('画布内的预览会话', JSON.stringify(out.sessionFromCanvas));

  // --- add a block ---
  await page.getByRole('button', { name: '添加区块', exact: true }).first().click();
  await page.waitForTimeout(1200);
  await page.locator('.section-library[role="dialog"] .section-library-group button', { hasText: '图文内容' }).first().click();
  await page.waitForTimeout(3500);
  step('新增图文区块');

  const card = page.locator('article.section-card').last();
  await card.locator('input[maxlength="240"]').first().fill(marker);
  await page.waitForTimeout(4000);

  const canvasHtml = async () => frame.locator('body').innerHTML().catch(() => '');
  const before = await canvasHtml();
  out.beforeSave = { hasBlock: before.includes('cms-custom-rich-text'), hasMarker: before.includes(marker) };
  step('保存前：画布含区块', String(out.beforeSave.hasBlock));
  step('保存前：画布含新标题', String(out.beforeSave.hasMarker));

  // --- save ---
  await page.locator('button', { hasText: '保存页面草稿' }).first().click();
  await page.waitForTimeout(9000);
  const after = await canvasHtml();
  out.afterSave = { hasBlock: after.includes('cms-custom-rich-text'), hasMarker: after.includes(marker) };
  step('保存后：画布含区块', String(out.afterSave.hasBlock));
  step('保存后：画布含新标题', String(out.afterSave.hasMarker));

  // The two can disagree, which means the text is reaching the canvas by a path
  // other than the block renderer. Capture the context to find out which.
  const idx = after.indexOf(marker);
  if (idx >= 0) {
    out.markerContext = after.slice(Math.max(0, idx - 320), idx + 140).replace(/\s+/g, ' ');
    step('marker 上下文', out.markerContext);
  }
  out.canvasCustomClasses = [...new Set((after.match(/cms-[a-z-]+/g) || []))].slice(0, 20);
  step('画布出现的 cms-* 类', JSON.stringify(out.canvasCustomClasses));

  // Re-query the canvas fresh after the save: what does the session say now, and
  // what does the DOM actually contain?
  out.sessionAfterSave = await frame.locator('body').evaluate(async () => {
    const res = await fetch('/api/preview/session', { credentials: 'include' });
    const json = await res.json();
    const preview = json?.data?.preview || null;
    return {
      sectionCount: Array.isArray(preview?.sections) ? preview.sections.length : null,
      sectionTypes: Array.isArray(preview?.sections) ? preview.sections.map((s) => s?.type || 'legacy') : null
    };
  }).catch((error) => ({ error: String(error) }));
  step('保存后会话中的区块', JSON.stringify(out.sessionAfterSave));

  out.domAfterSave = await frame.locator('body').evaluate(() => {
    const all = [...document.querySelectorAll('section')];
    return {
      sectionTotal: all.length,
      customCount: all.filter((s) => String(s.className).includes('cms-custom-')).length,
      lastClasses: all.slice(-3).map((s) => String(s.className).slice(0, 90))
    };
  }).catch((error) => ({ error: String(error) }));
  step('保存后画布 DOM', JSON.stringify(out.domAfterSave));

  // Hypothesis: `currentPreviewRecord` merges the workbench's pushed live record
  // OVER the session preview ({ ...session.preview, ...liveRecord }), so a stale
  // pushed snapshot overwrites the session's sections. Reloading drops the
  // override and the session data should render.
  await frame.locator('body').evaluate(() => location.reload()).catch(() => {});
  await page.waitForTimeout(10000);
  const reloaded = await canvasHtml();
  out.afterReload = { hasBlock: reloaded.includes('cms-custom-rich-text'), hasMarker: reloaded.includes(marker) };
  step('画布重载后含区块', String(out.afterReload.hasBlock));
  if (!out.afterReload.hasBlock) friction('重载画布后新区块消失');

  // Hypothesis: the canvas holds a stale render and the postMessage protocol only
  // carries field/presentation updates, not structural ones. Reload it to check.
  // Decisive cross-check: does the SAME saved draft render through the HTTP
  // preview path? That separates "save did not persist" from "canvas is stale".
  const issue = await fetch(`${CMS}/content-preview-tokens/issue`, {
    method: 'POST', headers: auth, body: JSON.stringify({ contentCollection: 'pages', contentItemId: PAGE_ID })
  });
  const previewToken = (await issue.json()).data.token;
  const open = await fetch('http://127.0.0.1:4175/api/preview/open', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: previewToken }), redirect: 'manual'
  });
  const cookie = (open.headers.getSetCookie() || []).map((c) => c.split(';')[0]).join('; ');
  const httpHtml = await (await fetch(new URL(open.headers.get('location'), 'http://127.0.0.1:4175').toString(), { headers: { cookie } })).text();
  out.httpPreview = { hasBlock: httpHtml.includes('cms-custom-rich-text'), hasMarker: httpHtml.includes(marker) };
  step('HTTP 预览路径含区块', String(out.httpPreview.hasBlock));
  step('HTTP 预览路径含新标题', String(out.httpPreview.hasMarker));

  if (out.httpPreview.hasBlock && !out.afterSave.hasBlock) {
    friction('同一份草稿：HTTP 预览能渲染新区块，但实时画布 iframe 不能 —— 问题在画布的刷新/取数，不在渲染或保存');
  } else if (!out.httpPreview.hasBlock) {
    friction('保存后连 HTTP 预览都不含新区块 —— 问题在保存或读取链路');
  }

  if (!out.afterSave.hasBlock) friction('保存后画布仍不显示新区块');
  if (out.afterSave.hasBlock && !out.beforeSave.hasBlock) {
    friction('新增区块必须保存后才出现在画布（结构变更不是实时的）—— 如果这是有意的，面板应提示；否则用户会以为没生效');
  }

  // --- field edit after save: is it live? ---
  const edited = `${marker}-改`;
  await card.locator('input[maxlength="240"]').first().fill(edited);
  await page.waitForTimeout(4500);
  const afterEdit = await canvasHtml();
  out.fieldEditLive = afterEdit.includes(edited);
  step('保存后改字段：画布实时更新', String(out.fieldEditLive));
  if (!out.fieldEditLive) friction('保存后修改字段，画布仍未实时更新');

  // --- hide reflected in canvas ---
  const hideBtn = card.getByRole('button', { name: '隐藏', exact: true });
  if (await hideBtn.count()) {
    await hideBtn.first().click();
    await page.waitForTimeout(5000);
    const hidden = await canvasHtml();
    out.hideReflected = !hidden.includes('cms-custom-rich-text');
    step('隐藏后画布不再显示', String(out.hideReflected));
    if (!out.hideReflected) friction('点了「隐藏」，画布仍显示该区块');
  } else {
    friction('找不到「隐藏」按钮');
  }

  await page.screenshot({ path: 'D:/CURSORpj/gaunwang/output/manual-launch/wb-walkthrough.png', fullPage: false });
} catch (e) {
  out.errors.push(`fatal: ${e.message}`);
  step('FAILED', e.message);
} finally {
  await browser.close();
  const restore = await fetch(`${CMS}/items/pages/${PAGE_ID}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ sections: original.sections }) });
  const after = (await (await fetch(`${CMS}/items/pages/${PAGE_ID}?fields=sections`, { headers: auth })).json()).data;
  step('清理：已还原页面', `${restore.status} → ${after.sections.length} 个区块`);
}
console.log('\n=== RESULT ===');
console.log(JSON.stringify(out, null, 2));
