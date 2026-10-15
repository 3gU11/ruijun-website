import { readFile } from 'node:fs/promises';

// Binds already-registered media into page sections so the canvas exposes each
// slot for replacement. Idempotent: re-running only adds what is missing and
// never duplicates or reorders existing entries.
//
// Default is a dry run; pass --apply to write.
const env = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8')).split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/); return match ? [[match[1].trim(), match[2]]] : [];
}));
const base = 'http://127.0.0.1:8055';
const apply = process.argv.includes('--apply');

// page id -> section id -> entries to ensure
const bindings = {
  1: {
    // The poster slot is already wired in the template; it only lacked a binding.
    hero: [{ role: 'poster', media_asset_id: '48' }],
    // page-preview-media-policy.mjs explicitly allows the home history section to
    // reuse the about timeline background, and index.vue already resolves a
    // `background` role there.
    history: [{ role: 'background', media_asset_id: '87' }]
  },
  2: {
    hero: [
      { role: 'background', media_asset_id: '189' },
      { role: 'foreground', media_asset_id: '294' }
    ],
    // Asset 87 is the named production candidate; 152 is a temporary one.
    history: [{ role: 'background', media_asset_id: '87' }]
  }
};

const login = await fetch(`${base}/auth/login`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
});
const token = (await login.json())?.data?.access_token;
if (!token) throw new Error('Admin login failed');
const headers = { 'content-type': 'application/json', authorization: `Bearer ${token}` };

let totalPending = 0;
for (const [pageId, sections] of Object.entries(bindings)) {
  const page = (await (await fetch(`${base}/items/pages/${pageId}?fields=id,slug,sections`, { headers })).json()).data;
  if (!page) { console.log(JSON.stringify({ pageId, status: 'not-found' })); continue; }
  let changed = 0;
  const nextSections = (page.sections || []).map((section) => {
    const wanted = sections[section.id];
    if (!wanted) return section;
    const media = Array.isArray(section.media) ? section.media : [];
    const missing = wanted.filter((entry) => !media.some((existing) => String(existing?.media_asset_id || '') === entry.media_asset_id));
    if (!missing.length) {
      console.log(JSON.stringify({ page: page.slug, section: section.id, action: 'skip', reason: 'already bound' }));
      return section;
    }
    changed += missing.length;
    missing.forEach((entry) => console.log(JSON.stringify({ page: page.slug, section: section.id, action: apply ? 'bind' : 'would-bind', ...entry })));
    return { ...section, media: [...media, ...missing] };
  });

  if (!changed) continue;
  totalPending += changed;
  if (!apply) continue;
  const response = await fetch(`${base}/items/pages/${pageId}`, { method: 'PATCH', headers, body: JSON.stringify({ sections: nextSections }) });
  console.log(JSON.stringify({ page: page.slug, status: response.status, bound: changed }));
  const after = (await (await fetch(`${base}/items/pages/${pageId}?fields=sections`, { headers })).json()).data;
  for (const sectionId of Object.keys(sections)) {
    const section = (after.sections || []).find((candidate) => candidate.id === sectionId);
    console.log(JSON.stringify({ page: page.slug, section: sectionId, media: section?.media || [] }));
  }
}

console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', pending: totalPending, ...(apply ? {} : { hint: 're-run with --apply' }) }));
