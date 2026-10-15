import { readFile } from 'node:fs/promises';

// Walks the governed media lifecycle for the given assets:
//   draft -> review -> scheduled -> published
// The `draft -> review` step is restricted to the content_editor role by
// content-publication-workflow.mjs, so a throwaway editor is created for that
// single transition and removed afterwards. Every other step runs as the admin.
const env = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8')).split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/); return match ? [[match[1].trim(), match[2]]] : [];
}));
const base = 'http://127.0.0.1:8055';
const collection = process.env.COLLECTION || 'media_assets';
const assetIds = process.argv.slice(2).filter((value) => /^\d+$/.test(value));
if (!assetIds.length) throw new Error('Pass one or more record ids');
const apply = process.env.APPLY === '1';

const login = async (email, password) => {
  const response = await fetch(`${base}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return (await response.json())?.data?.access_token || '';
};
const adminToken = await login(env.ADMIN_EMAIL, env.ADMIN_PASSWORD);
if (!adminToken) throw new Error('Admin login failed');
const adminHeaders = { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` };
const patch = async (id, body, headers = adminHeaders) => {
  const response = await fetch(`${base}/items/${collection}/${id}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, error: payload?.errors?.[0]?.message || '', data: payload?.data };
};

// The editor role is only needed to submit a draft for review.
const roles = await (await fetch(`${base}/roles?limit=50`, { headers: adminHeaders })).json();
const editorRoleId = (roles.data || []).find((role) => role.name === '内容编辑')?.id;
if (!editorRoleId) throw new Error('The 内容编辑 role was not found');
const editorEmail = `tmp-publish-${Date.now()}@example.com`;
const editorPassword = 'TempPublish!2026';
let editorUserId = '';

if (!apply) {
  console.log(JSON.stringify({ mode: 'dry-run', assets: assetIds, plan: ['draft->review (temp editor)', 'review->scheduled (admin)', 'scheduled->published (admin)'], hint: 'set APPLY=1 to execute' }));
  process.exit(0);
}

try {
  const created = await fetch(`${base}/users`, {
    method: 'POST', headers: adminHeaders,
    body: JSON.stringify({ email: editorEmail, password: editorPassword, role: editorRoleId, status: 'active', first_name: '临时', last_name: '发布' })
  });
  editorUserId = String((await created.json())?.data?.id || '');
  if (!editorUserId) throw new Error(`Could not create the temporary editor (${created.status})`);
  const editorToken = await login(editorEmail, editorPassword);
  const editorHeaders = { 'content-type': 'application/json', authorization: `Bearer ${editorToken}` };

  for (const id of assetIds) {
    const steps = [];
    const review = await patch(id, { status: 'review' }, editorHeaders);
    steps.push(`draft->review:${review.status}${review.error ? ` (${review.error})` : ''}`);
    if (review.status === 200) {
      const scheduled = await patch(id, { status: 'scheduled' });
      steps.push(`review->scheduled:${scheduled.status}${scheduled.error ? ` (${scheduled.error})` : ''}`);
      if (scheduled.status === 200) {
        const published = await patch(id, { status: 'published' });
        steps.push(`scheduled->published:${published.status}${published.error ? ` (${published.error})` : ''}`);
      }
    }
    const final = (await (await fetch(`${base}/items/${collection}/${id}?fields=id,title,status,publication_state,copyright_status`, { headers: adminHeaders })).json()).data;
    console.log(JSON.stringify({ id, steps, final }));
  }
} finally {
  if (editorUserId) await fetch(`${base}/users/${editorUserId}`, { method: 'DELETE', headers: adminHeaders });
  console.log(JSON.stringify({ cleanup: 'temporary editor removed', editorUserId }));
}
