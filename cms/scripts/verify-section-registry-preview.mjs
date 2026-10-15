// End-to-end verification for a registry-driven page section.
//
// Runs the REAL preview pipeline over HTTP (issue token -> POST /api/preview/open
// -> follow the 303 with the session cookie) and asserts that the custom block
// renders with its fields and visual-edit bindings.
//
// Usage:
//   node scripts/verify-section-registry-preview.mjs <pageItemId> [expectedText]
//
// Requires the local stack (MySQL, MinIO, Directus :8055, Nuxt :4175) to be up,
// and the target page to already contain a saved registry section (type set).
import { readFileSync } from 'node:fs';

const cmsRoot = 'D:/CURSORpj/gaunwang';
const env = Object.fromEntries(readFileSync(`${cmsRoot}/cms/.env.local`, 'utf8')
  .split(/\r?\n/).flatMap((line) => { const m = line.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));

const itemId = process.argv[2] || '3';
const expected = process.argv[3] || '';
const CMS = 'http://127.0.0.1:8055';
const SITE = 'http://127.0.0.1:4175';
const checks = [];
const check = (label, ok, extra = '') => { checks.push({ label, ok }); console.log(`${ok ? 'ok  ' : 'FAIL'} - ${label}${extra ? ` :: ${extra}` : ''}`); };

const login = await fetch(`${CMS}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
});
const accessToken = (await login.json()).data?.access_token;
check('CMS 登录成功', Boolean(accessToken));
if (!accessToken) process.exit(1);

const issue = await fetch(`${CMS}/content-preview-tokens/issue`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
  body: JSON.stringify({ contentCollection: 'pages', contentItemId: String(itemId) })
});
const issueBody = await issue.json();
const previewToken = issueBody?.data?.token;
check('签发预览令牌', Boolean(previewToken), `status=${issue.status}`);
if (!previewToken) process.exit(1);

const open = await fetch(`${SITE}/api/preview/open`, {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ token: previewToken }), redirect: 'manual'
});
check('预览令牌交换返回 303', open.status === 303, `status=${open.status}`);
const cookies = open.headers.getSetCookie?.() || [];
const cookieHeader = cookies.map((c) => c.split(';')[0]).join('; ');
check('下发预览会话 cookie', cookies.length > 0, `count=${cookies.length}`);

const location = new URL(open.headers.get('location') || '/', SITE).toString();
check('重定向带 cmsPreview=1', location.includes('cmsPreview=1'), location);

const pageRes = await fetch(location, { headers: { cookie: cookieHeader } });
const html = await pageRes.text();
check('预览页返回 200', pageRes.status === 200, `status=${pageRes.status}`);

check('渲染自定义区块容器', html.includes('cms-custom-rich-text'));
check('渲染可视编辑绑定（kicker/title/body）',
  html.includes('data-cms-preview-field-path="kicker"') &&
  html.includes('data-cms-preview-field-path="title"') &&
  html.includes('data-cms-preview-field-path="body"'));
check('应用区块版式变量', html.includes('--cms-content-width'));
if (expected) check(`渲染预期内容 “${expected}”`, html.includes(expected));

const failed = checks.filter((c) => !c.ok);
console.log(`\n${failed.length === 0 ? 'ALL PASS' : `${failed.length} FAILED`} (${checks.length - failed.length}/${checks.length})`);
process.exit(failed.length ? 1 : 0);
