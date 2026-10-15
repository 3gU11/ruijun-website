import { readFile } from 'node:fs/promises';
import { chromium } from '../../../website/node_modules/playwright/index.mjs';

// Isolated experiment: write a custom block straight through the API (no
// workbench involved), then open the canvas fresh. This separates
//   "the canvas cannot render custom blocks at all"
// from
//   "the canvas does not pick up newly added blocks".
const env = Object.fromEntries((await readFile(new URL('../../.env.local', import.meta.url), 'utf8'))
  .split(/\r?\n/).flatMap((l) => { const m = l.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));

const CMS = 'http://127.0.0.1:8055';
const PAGE_ID = '3';
const marker = `隔离-${Date.now().toString(36)}`;
// The registry only accepts [a-z0-9-] ids, so the id must stay ASCII even though
// the visible title is Chinese. Using the marker here would make the block fail
// validation and silently not render — which is correct, but not what we test.
const blockId = `custom-rich-text-diag${Date.now().toString(36)}`;

const login = await fetch(`${CMS}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
});
const token = (await login.json()).data.access_token;
const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
const original = (await (await fetch(`${CMS}/items/pages/${PAGE_ID}?fields=sections`, { headers: auth })).json()).data;

await fetch(`${CMS}/items/pages/${PAGE_ID}`, {
  method: 'PATCH', headers: auth,
  body: JSON.stringify({ sections: [...original.sections, {
    id: blockId, type: 'rich-text', version: 1, enabled: true,
    title: marker, kicker: '', body: ''
  }] })
});
console.log(`[setup] 已通过 API 写入区块 ${marker}`);

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1800, height: 1100 } });
  page.on('dialog', (d) => d.accept());
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || /hydrat|Suspense/i.test(m.text())) logs.push(m.text().slice(0, 240)); });

  // Record every postMessage the workbench sends into the canvas. The live
  // record is merged OVER the session preview in currentPreviewRecord(), so if
  // the pushed snapshot carries a stale `sections` array it would hide the block.
  await page.addInitScript(() => {
    window.__cmsPreviewMessages = [];
    window.addEventListener('message', (event) => {
      const d = event.data || {};
      try {
        // Find `sections` anywhere in the message so the shape does not matter.
        const found = [];
        const walk = (node, path, depth) => {
          if (!node || typeof node !== 'object' || depth > 4) return;
          for (const [key, value] of Object.entries(node)) {
            if (key === 'sections' && Array.isArray(value)) {
              found.push(`${path}${key}:${value.length}:[${value.map((s) => s?.type || 'legacy').join(',')}]`);
            } else if (value && typeof value === 'object') {
              walk(value, `${path}${key}.`, depth + 1);
            }
          }
        };
        walk(d, '', 0);
        window.__cmsPreviewMessages.push({
          type: d.type ?? null,
          keys: Object.keys(d).slice(0, 10),
          sectionsFound: found,
          sample: JSON.stringify(d).slice(0, 220)
        });
      } catch { /* ignore */ }
    });
  });

  await page.goto(`${CMS}/admin/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 60000 });

  await page.goto(`${CMS}/admin/ruijun-content-editor-workbench`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  await page.getByRole('button', { name: '服务支持', exact: true }).click();
  await page.waitForTimeout(4500);
  await page.getByRole('button', { name: '服务支持首屏', exact: true }).click();
  await page.waitForTimeout(6000);

  const openPreview = page.getByRole('button', { name: '打开实时预览', exact: true });
  if (await openPreview.count()) await openPreview.first().click();
  await page.waitForTimeout(12000);

  const frame = page.frameLocator('iframe[name="ruijun-live-website-preview"]');
  const dom = await frame.locator('body').evaluate(() => {
    const all = [...document.querySelectorAll('section')];
    return { total: all.length, custom: all.filter((s) => String(s.className).includes('cms-custom-')).length };
  }).catch((e) => ({ error: String(e) }));

  // Also ask the canvas what its session says, for comparison.
  const session = await frame.locator('body').evaluate(async () => {
    const r = await fetch('/api/preview/session', { credentials: 'include' });
    const j = await r.json();
    const s = j?.data?.preview?.sections;
    return { count: Array.isArray(s) ? s.length : null, types: Array.isArray(s) ? s.map((x) => x?.type || 'legacy') : null };
  }).catch((e) => ({ error: String(e) }));

  // And fetch the same URL over plain HTTP (SSR path) for comparison.
  const issue = await fetch(`${CMS}/content-preview-tokens/issue`, { method: 'POST', headers: auth, body: JSON.stringify({ contentCollection: 'pages', contentItemId: PAGE_ID }) });
  const pt = (await issue.json()).data.token;
  const open = await fetch('http://127.0.0.1:4175/api/preview/open', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: pt }), redirect: 'manual' });
  const cookie = (open.headers.getSetCookie() || []).map((c) => c.split(';')[0]).join('; ');
  const httpHtml = await (await fetch(new URL(open.headers.get('location'), 'http://127.0.0.1:4175').toString(), { headers: { cookie } })).text();

  console.log('[画布] DOM section 总数:', dom.total, '| 自定义区块数:', dom.custom);
  console.log('[画布] 会话中的区块:', JSON.stringify(session));

  const messages = await frame.locator('body')
    .evaluate(() => (window.__cmsPreviewMessages || []).slice(-10))
    .catch((e) => [{ error: String(e) }]);
  console.log('[画布收到的 postMessage]', JSON.stringify(messages));
  console.log('[HTTP/SSR] 含区块容器:', httpHtml.includes('cms-custom-rich-text'), '| 含标题:', httpHtml.includes(marker));

  // Control: load the SAME preview URL directly in a browser (no workbench, no
  // iframe). If the block renders here, the problem is the workbench's iframe;
  // if not, it is the ?cmsPreview=1 client path itself.
  const [cookieName, ...cookieRest] = cookie.split('=');
  await page.context().addCookies([{ name: cookieName, value: cookieRest.join('='), domain: '127.0.0.1', path: '/' }]);
  await page.goto('http://127.0.0.1:4175/service?cmsPreview=1', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(8000);
  const directDom = await page.evaluate(() => {
    const all = [...document.querySelectorAll('section')];
    return {
      total: all.length,
      custom: all.filter((s) => String(s.className).includes('cms-custom-')).length,
      hasMarkerInText: document.body.innerText.includes('隔离')
    };
  });
  console.log('[直连 ?cmsPreview=1] section 总数:', directDom.total, '| 自定义区块:', directDom.custom, '| 正文含标题:', directDom.hasMarkerInText);

  // Control 2: the workbench's messages carry `editMode`. Flip the same page into
  // visual edit mode the way the canvas does. If the block disappears, editMode
  // is the trigger rather than the iframe itself.
  await page.evaluate(async () => {
    const res = await fetch('/api/preview/session', { credentials: 'include' });
    const json = await res.json();
    window.postMessage({
      type: 'ruijun:cms-preview:update',
      collection: json?.data?.collection,
      itemId: String(json?.data?.itemId ?? ''),
      preview: json?.data?.preview,
      mediaGrants: [],
      editMode: true,
      tool: 'select',
      device: 'desktop'
    }, '*');
  });
  await page.waitForTimeout(5000);
  const afterEditMode = await page.evaluate(() => {
    const all = [...document.querySelectorAll('section')];
    return {
      total: all.length,
      custom: all.filter((s) => String(s.className).includes('cms-custom-')).length,
      bodyHasMarker: document.body.innerText.includes('隔离')
    };
  });
  console.log('[直连 + editMode=true] section 总数:', afterEditMode.total, '| 自定义区块:', afterEditMode.custom, '| 正文含标题:', afterEditMode.bodyHasMarker);

  // Flip editMode back off. If the block returns, the flag alone drives it and
  // the cause is somewhere in the visual-edit-mode render path.
  await page.evaluate(async () => {
    const res = await fetch('/api/preview/session', { credentials: 'include' });
    const json = await res.json();
    window.postMessage({
      type: 'ruijun:cms-preview:update',
      collection: json?.data?.collection,
      itemId: String(json?.data?.itemId ?? ''),
      preview: json?.data?.preview,
      mediaGrants: [],
      editMode: false,
      tool: 'select',
      device: 'desktop'
    }, '*');
  });
  await page.waitForTimeout(5000);
  const backOff = await page.evaluate(() => {
    const all = [...document.querySelectorAll('section')];
    return { total: all.length, custom: all.filter((s) => String(s.className).includes('cms-custom-')).length };
  });
  console.log('[直连 + editMode=false] section 总数:', backOff.total, '| 自定义区块:', backOff.custom);
  console.log('[控制台]', logs.slice(0, 4));
} finally {
  await browser.close();
  await fetch(`${CMS}/items/pages/${PAGE_ID}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ sections: original.sections }) });
  const after = (await (await fetch(`${CMS}/items/pages/${PAGE_ID}?fields=sections`, { headers: auth })).json()).data;
  console.log('[cleanup] 已还原为', after.sections.length, '个区块');
}
