import { readFileSync } from 'node:fs';

// Confirms the pasted block reached the about page, then restores both pages.
const env = Object.fromEntries(readFileSync('D:/CURSORpj/gaunwang/cms/.env.local', 'utf8')
  .split(/\r?\n/).flatMap((l) => { const m = l.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));

const CMS = 'http://127.0.0.1:8055';
const login = await fetch(`${CMS}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
});
const token = (await login.json()).data.access_token;
const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

const pages = (await (await fetch(`${CMS}/items/pages?fields=id,slug,sections&limit=50`, { headers: auth })).json()).data;
const checks = {};
for (const page of pages) {
  const custom = (page.sections || []).filter((s) => s.type);
  if (custom.length) {
    console.log(`${page.slug} (id=${page.id}) has ${custom.length} custom block(s):`);
    for (const b of custom) console.log('  -', b.id, '| type =', b.type, '| title =', JSON.stringify(b.title), '| items =', b.items?.length ?? 0);
  }
}

const about = pages.find((p) => p.slug === 'about');
const pasted = (about?.sections || []).find((s) => s.type === 'stats');
checks['粘贴的区块落在 about 页'] = Boolean(pasted);
checks['内容已随块复制'] = pasted?.title === 'E2E 跨页指标' && pasted?.items?.[0]?.value === '50+' && pasted?.items?.[0]?.label === '直属办事处';
checks['粘贴生成新 ID（非源块 ID）'] = Boolean(pasted?.id) && pasted.id.startsWith('custom-stats-');
checks['源页 service 未被改动'] = !(pages.find((p) => p.slug === 'service')?.sections || []).some((s) => s.type);

for (const [k, v] of Object.entries(checks)) console.log(`${v ? 'ok  ' : 'FAIL'} - ${k}`);

// Restore every page that picked up a test block.
for (const page of pages) {
  const kept = (page.sections || []).filter((s) => !s.type);
  if (kept.length !== (page.sections || []).length) {
    const r = await fetch(`${CMS}/items/pages/${page.id}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ sections: kept }) });
    console.log(`cleanup ${page.slug}: ${r.status} -> ${kept.length} sections`);
  }
}
