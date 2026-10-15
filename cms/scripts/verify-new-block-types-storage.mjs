import { readFileSync } from 'node:fs';

// Verifies the faq block reached storage and renders, then removes the test block.
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
const block = record.sections.find((s) => s.type === 'faq');
console.log('stored faq:', block ? `${block.id} | title=${JSON.stringify(block.title)} | items=${block.items?.length}` : '(none)');

const checks = {
  '区块已落库': Boolean(block),
  '标题已保存': block?.title === 'E2E 常见问题',
  '问答条目已保存': block?.items?.length === 1,
  '问题内容正确': block?.items?.[0]?.title === 'E2E 问题一',
  '回答内容正确': block?.items?.[0]?.body === 'E2E 回答一'
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

checks['预览渲染区块容器'] = html.includes('cms-custom-faq');
checks['预览渲染问题'] = html.includes('E2E 问题一');
checks['预览渲染回答'] = html.includes('E2E 回答一');
checks['问答字段已绑定'] = html.includes('items.0.title') && html.includes('items.0.body');

for (const [k, v] of Object.entries(checks)) console.log(`${v ? 'ok  ' : 'FAIL'} - ${k}`);
const failed = Object.values(checks).filter((v) => !v).length;
console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'} (${Object.keys(checks).length - failed}/${Object.keys(checks).length})`);

const kept = record.sections.filter((s) => s.type !== 'faq');
const restore = await fetch(`${CMS}/items/pages/${pageId}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ sections: kept }) });
console.log('\ncleanup PATCH:', restore.status);
const after = (await (await fetch(`${CMS}/items/pages/${pageId}?fields=sections`, { headers: auth })).json()).data;
console.log('sections restored to:', after.sections.length);
