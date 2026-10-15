import { readFileSync } from 'node:fs';

// Confirms an applied preset reached storage, then removes the test block.
const env = Object.fromEntries(readFileSync('D:/CURSORpj/gaunwang/cms/.env.local', 'utf8')
  .split(/\r?\n/).flatMap((l) => { const m = l.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));

const CMS = 'http://127.0.0.1:8055';
const pageId = '3';

const login = await fetch(`${CMS}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
});
const token = (await login.json()).data.access_token;
const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

const record = (await (await fetch(`${CMS}/items/pages/${pageId}?fields=id,sections`, { headers: auth })).json()).data;
const block = record.sections.find((s) => s.type === 'card-grid');
console.log('stored card-grid:', block ? `${block.id} | variant=${block.variant} | columns=${block.columns} | items=${block.items?.length}` : '(none)');

const checks = {
  '区块已落库': Boolean(block),
  '预设条数已应用 (2)': block?.items?.length === 2,
  '预设版式已应用 (grid)': block?.variant === 'grid',
  '预设列数已应用 (2)': block?.columns === 2,
  '预设内容已写入': block?.items?.[0]?.title === '卡片一' && block?.items?.[1]?.title === '卡片二'
};
for (const [k, v] of Object.entries(checks)) console.log(`${v ? 'ok  ' : 'FAIL'} - ${k}`);
const failed = Object.values(checks).filter((v) => !v).length;
console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'} (${Object.keys(checks).length - failed}/${Object.keys(checks).length})`);

const kept = record.sections.filter((s) => s.type !== 'card-grid');
const restore = await fetch(`${CMS}/items/pages/${pageId}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ sections: kept }) });
console.log('\ncleanup PATCH:', restore.status);
const after = (await (await fetch(`${CMS}/items/pages/${pageId}?fields=sections`, { headers: auth })).json()).data;
console.log('sections restored to:', after.sections.length);
