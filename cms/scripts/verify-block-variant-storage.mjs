import { readFileSync } from 'node:fs';

// Verifies a stored block variant reaches both the record and the rendered markup.
const env = Object.fromEntries(readFileSync('D:/CURSORpj/gaunwang/cms/.env.local', 'utf8')
  .split(/\r?\n/).flatMap((l) => { const m = l.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));

const CMS = 'http://127.0.0.1:8055';
const SITE = 'http://127.0.0.1:4175';
const pageId = '3';

const login = await fetch(`${CMS}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
});
const token = (await login.json()).data.access_token;
const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

const record = (await (await fetch(`${CMS}/items/pages/${pageId}?fields=id,sections`, { headers: auth })).json()).data;
const block = record.sections.find((s) => s.type === 'card-grid');
console.log('stored card-grid:', block ? `${block.id} | variant = ${block.variant}` : '(none)');

const checks = {
  '区块已落库': Boolean(block),
  '版式已保存为 list': block?.variant === 'list'
};

const issue = await fetch(`${CMS}/content-preview-tokens/issue`, {
  method: 'POST', headers: auth, body: JSON.stringify({ contentCollection: 'pages', contentItemId: pageId })
});
const previewToken = (await issue.json()).data.token;
const open = await fetch(`${SITE}/api/preview/open`, {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ token: previewToken }), redirect: 'manual'
});
const cookie = (open.headers.getSetCookie() || []).map((c) => c.split(';')[0]).join('; ');
const html = await (await fetch(new URL(open.headers.get('location'), SITE).toString(), { headers: { cookie } })).text();

checks['区块已渲染'] = html.includes('cms-custom-card-grid');
checks['渲染带入选中的版式类'] = html.includes('cms-variant-list');
checks['未回退到默认网格版式'] = !html.includes('cms-custom-card-list cms-variant-grid');

for (const [k, v] of Object.entries(checks)) console.log(`${v ? 'ok  ' : 'FAIL'} - ${k}`);
const failed = Object.values(checks).filter((v) => !v).length;
console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'} (${Object.keys(checks).length - failed}/${Object.keys(checks).length})`);

const kept = record.sections.filter((s) => s.type !== 'card-grid');
const restore = await fetch(`${CMS}/items/pages/${pageId}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ sections: kept }) });
console.log('\ncleanup PATCH:', restore.status);
const after = (await (await fetch(`${CMS}/items/pages/${pageId}?fields=sections`, { headers: auth })).json()).data;
console.log('sections restored to:', after.sections.length);
