import { readFileSync } from 'node:fs';

// Proves the P3 migration on a second page: register a rich-text block on the
// about page through the API, confirm it renders in the draft preview, then
// remove it so no test data is left behind.
const env = Object.fromEntries(readFileSync('D:/CURSORpj/gaunwang/cms/.env.local', 'utf8')
  .split(/\r?\n/).flatMap((l) => { const m = l.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));

const CMS = 'http://127.0.0.1:8055';
const SITE = 'http://127.0.0.1:4175';
const SLUG = 'about';

const login = await fetch(`${CMS}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
});
const token = (await login.json()).data.access_token;
const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

const found = (await (await fetch(`${CMS}/items/pages?filter[slug][_eq]=${SLUG}&fields=id,slug,status,sections`, { headers: auth })).json()).data[0];
console.log('page:', found.id, found.slug, '| existing sections:', found.sections.length);
const originalSections = found.sections;

const marker = `E2E-${Date.now().toString(36)}`;
const blockId = `custom-rich-text-${marker.toLowerCase()}`;
const nextSections = [...originalSections, {
  id: blockId, type: 'rich-text', version: 1, enabled: true,
  kicker: 'E2E 校验', title: `关于页区块 ${marker}`, body: `跨页迁移验证 ${marker}`
}];

const patched = await fetch(`${CMS}/items/pages/${found.id}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ sections: nextSections }) });
console.log('PATCH add:', patched.status);

try {
  const issue = await fetch(`${CMS}/content-preview-tokens/issue`, {
    method: 'POST', headers: auth, body: JSON.stringify({ contentCollection: 'pages', contentItemId: String(found.id) })
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
    '关于页返回预览 200': open.status === 303,
    '共享组件渲染容器': html.includes('cms-custom-rich-text'),
    '新区块标题可见': html.includes(`关于页区块 ${marker}`),
    '新区块正文可见': html.includes(`跨页迁移验证 ${marker}`),
    '可视编辑字段绑定': html.includes('data-cms-preview-field-path="title"'),
    '版式变量已应用': html.includes('--cms-content-width')
  };
  for (const [k, v] of Object.entries(checks)) console.log(`${v ? 'ok  ' : 'FAIL'} - ${k}`);
  const failed = Object.values(checks).filter((v) => !v).length;
  console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'} (${Object.keys(checks).length - failed}/${Object.keys(checks).length})`);
} finally {
  const restore = await fetch(`${CMS}/items/pages/${found.id}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ sections: originalSections }) });
  console.log('\ncleanup PATCH:', restore.status);
  const after = (await (await fetch(`${CMS}/items/pages/${found.id}?fields=sections`, { headers: auth })).json()).data;
  console.log('sections restored to:', after.sections.length);
}
