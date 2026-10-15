import { readFile } from 'node:fs/promises';

// Binds the registered homepage reason media into the page sections so the
// canvas exposes each slot for replacement. Idempotent: re-running only adds a
// missing entry and never duplicates or reorders existing ones.
const env = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8')).split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/); return match ? [[match[1].trim(), match[2]]] : [];
}));
const base = 'http://127.0.0.1:8055';
const apply = process.argv.includes('--apply');

// section id -> { role, media_asset_id }
const bindings = {
  performance: { role: 'foreground', media_asset_id: '89' },
  'advanced-manufacturing': { role: 'background', media_asset_id: '90' },
  'industry-leadership': { role: 'background', media_asset_id: '91' }
};

const login = await fetch(`${base}/auth/login`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
});
const token = (await login.json())?.data?.access_token;
if (!token) throw new Error('Admin login failed');
const headers = { 'content-type': 'application/json', authorization: `Bearer ${token}` };

const page = (await (await fetch(`${base}/items/pages/1?fields=id,sections`, { headers })).json()).data;
const sections = Array.isArray(page.sections) ? page.sections : [];

let changed = 0;
const nextSections = sections.map((section) => {
  const target = bindings[section.id];
  if (!target) return section;
  const media = Array.isArray(section.media) ? section.media : [];
  const already = media.some((entry) => String(entry?.media_asset_id || '') === target.media_asset_id);
  if (already) {
    console.log(JSON.stringify({ section: section.id, action: 'skip', reason: 'already bound' }));
    return section;
  }
  changed += 1;
  console.log(JSON.stringify({ section: section.id, action: apply ? 'bind' : 'would-bind', ...target }));
  return { ...section, media: [...media, target] };
});

if (!apply) {
  console.log(JSON.stringify({ mode: 'dry-run', pending: changed, hint: 're-run with --apply' }));
} else if (!changed) {
  console.log(JSON.stringify({ mode: 'apply', pending: 0, note: 'nothing to change' }));
} else {
  const response = await fetch(`${base}/items/pages/1`, { method: 'PATCH', headers, body: JSON.stringify({ sections: nextSections }) });
  console.log(JSON.stringify({ mode: 'apply', status: response.status, bound: changed }));
  const after = (await (await fetch(`${base}/items/pages/1?fields=sections`, { headers })).json()).data;
  for (const id of Object.keys(bindings)) {
    const section = after.sections.find((candidate) => candidate.id === id);
    console.log(JSON.stringify({ section: id, media: section?.media || [] }));
  }
}
