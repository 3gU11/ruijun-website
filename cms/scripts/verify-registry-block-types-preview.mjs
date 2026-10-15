import { readFileSync } from 'node:fs';

// Verify the draft preview renders the new registry block types with their
// visual-edit bindings, using the real token exchange flow.
const env = Object.fromEntries(readFileSync('D:/CURSORpj/gaunwang/cms/.env.local', 'utf8')
  .split(/\r?\n/).flatMap((l) => { const m = l.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));

const CMS = 'http://127.0.0.1:8055';
const SITE = 'http://127.0.0.1:4175';

const login = await fetch(`${CMS}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
});
const token = (await login.json()).data.access_token;

const issue = await fetch(`${CMS}/content-preview-tokens/issue`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ contentCollection: 'pages', contentItemId: '3' })
});
const previewToken = (await issue.json()).data.token;

const open = await fetch(`${SITE}/api/preview/open`, {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ token: previewToken }), redirect: 'manual'
});
const cookie = (open.headers.getSetCookie() || []).map((c) => c.split(';')[0]).join('; ');
const target = new URL(open.headers.get('location'), SITE).toString();
const html = await (await fetch(target, { headers: { cookie } })).text();

const checks = {
  'image 区块容器': html.includes('cms-custom-image'),
  'image 区块标题': html.includes('E2E 图片区块标题'),
  'image 区块说明': html.includes('E2E 图片区块说明'),
  'card-grid 区块容器': html.includes('cms-custom-card-grid'),
  'card-grid 区块标题': html.includes('E2E 卡片列表标题'),
  'card-grid 卡片内容': html.includes('E2E 卡片一'),
  'card-grid 卡片说明': html.includes('E2E 卡片一说明'),
  '卡片字段绑定': html.includes('items.0.title') || html.includes('items.0.body'),
  '版式变量已应用': html.includes('--cms-content-width'),
  // The empty-media placeholder is edit-mode only, so it must NOT appear in a
  // plain SSR fetch (no workbench postMessage has set the edit flag).
  '编辑态占位符未泄漏到公开渲染': !html.includes('请在右侧属性面板添加图片素材')
};
for (const [k, v] of Object.entries(checks)) console.log(`${v ? 'ok  ' : 'FAIL'} - ${k}`);
const failed = Object.values(checks).filter((v) => !v).length;
console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'} (${Object.keys(checks).length - failed}/${Object.keys(checks).length})`);
