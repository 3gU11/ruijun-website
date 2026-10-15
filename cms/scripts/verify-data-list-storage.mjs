import { readFileSync } from 'node:fs';

// Verifies the stored data-list block and its public rendering behaviour.
//
// All source collections in this CMS are drafts, so the public reader correctly
// returns nothing for them. That means an empty data-list must render NOTHING on
// the public page (fail-safe), while still being stored and editable.
const env = Object.fromEntries(readFileSync('D:/CURSORpj/gaunwang/cms/.env.local', 'utf8')
  .split(/\r?\n/).flatMap((l) => { const m = l.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));

const CMS = 'http://127.0.0.1:8055';
const SITE = 'http://127.0.0.1:4175';

const login = await fetch(`${CMS}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
});
const token = (await login.json()).data.access_token;
const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

const pageId = '3';
const record = (await (await fetch(`${CMS}/items/pages/${pageId}?fields=id,sections`, { headers: auth })).json()).data;
const blocks = record.sections.filter((s) => s.type === 'data-list');
console.log('stored data-list blocks:', blocks.length);
for (const b of blocks) {
  console.log('  -', b.id, '| source =', b.source, '| limit =', b.limit, '| columns =', b.columns, '| title =', JSON.stringify(b.title));
}
const stored = blocks[0];

const checks = {
  '区块已落库': Boolean(stored),
  '来源已保存': stored?.source === 'articles',
  '条数已保存': stored?.limit === 4,
  '每行卡片数已保存': stored?.columns === 2
};

// Public/preview rendering: an empty source must not emit the block.
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

checks['数据源为空时公开渲染不输出该区块'] = !html.includes('cms-custom-data-list');
checks['编辑态空提示未泄漏到公开渲染'] = !html.includes('数据源暂无已发布内容');

for (const [k, v] of Object.entries(checks)) console.log(`${v ? 'ok  ' : 'FAIL'} - ${k}`);
const failed = Object.values(checks).filter((v) => !v).length;
console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'} (${Object.keys(checks).length - failed}/${Object.keys(checks).length})`);

// Clean up the block this run added.
const kept = record.sections.filter((s) => s.type !== 'data-list');
const restore = await fetch(`${CMS}/items/pages/${pageId}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ sections: kept }) });
console.log('\ncleanup PATCH:', restore.status);
const after = (await (await fetch(`${CMS}/items/pages/${pageId}?fields=sections`, { headers: auth })).json()).data;
console.log('sections restored to:', after.sections.length);
