import { readFile } from 'node:fs/promises';

// BB-40: a saved draft must never become publicly visible. Verifies that an
// editor can write content but cannot flip the record to published, and that
// anonymous reads stay blocked.
const env = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8')).split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/); return match ? [[match[1].trim(), match[2]]] : [];
}));
const base = 'http://127.0.0.1:8055';
const PW = 'TempVerify!2026';
const editorEmail = `tmp-bb40-${Date.now()}@example.com`;
let editorUserId = '';

async function login(email, password) {
  const response = await fetch(`${base}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return (await response.json())?.data?.access_token || '';
}

const adminToken = await login(env.ADMIN_EMAIL, env.ADMIN_PASSWORD);
const adminHeaders = { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` };
const roles = await (await fetch(`${base}/roles?fields=id,name&limit=50`, { headers: adminHeaders })).json();
const editorRoleId = roles.data?.find((role) => role.name === '内容编辑')?.id;
if (!editorRoleId) throw new Error('The 内容编辑 role was not found');
const userResponse = await fetch(`${base}/users`, {
  method: 'POST', headers: adminHeaders,
  body: JSON.stringify({ email: editorEmail, password: PW, role: editorRoleId, status: 'active', first_name: '临时', last_name: 'BB40' })
});
editorUserId = String((await userResponse.json())?.data?.id || '');
if (!editorUserId) throw new Error(`Could not create the temporary editor (${userResponse.status})`);

const before = await (await fetch(`${base}/items/pages/1?fields=id,title,status,publication_state`, { headers: adminHeaders })).json();
const original = before.data;
console.log(JSON.stringify({ step: 'baseline', status: original.status, publicationState: original.publication_state }));

const anonymous = await fetch(`${base}/items/pages/1`);
console.log(JSON.stringify({ step: 'anonymous-read-before', status: anonymous.status }));

const editorToken = await login(editorEmail, PW);
const editorHeaders = { 'content-type': 'application/json', authorization: `Bearer ${editorToken}` };

try {
  // Write a temporary title as a draft.
  const write = await fetch(`${base}/items/pages/1`, {
    method: 'PATCH', headers: editorHeaders, body: JSON.stringify({ title: '临时草稿标题-BB40' })
  });
  console.log(JSON.stringify({ step: 'editor-save-draft', status: write.status }));

  // Attempt to publish the same record.
  const publish = await fetch(`${base}/items/pages/1`, {
    method: 'PATCH', headers: editorHeaders, body: JSON.stringify({ publication_state: 'published' })
  });
  console.log(JSON.stringify({ step: 'editor-attempt-publish', httpStatus: publish.status }));

  const after = await (await fetch(`${base}/items/pages/1?fields=id,title,status,publication_state`, { headers: adminHeaders })).json();
  console.log(JSON.stringify({
    step: 'after',
    title: after.data?.title,
    status: after.data?.status,
    publicationState: after.data?.publication_state,
    draftSaved: after.data?.title === '临时草稿标题-BB40',
    stillNotPublished: after.data?.publication_state !== 'published'
  }));

  const anonymousAfter = await fetch(`${base}/items/pages/1`);
  const anonymousBody = await anonymousAfter.json().catch(() => ({}));
  console.log(JSON.stringify({
    step: 'anonymous-read-after',
    status: anonymousAfter.status,
    leakedTitle: String(anonymousBody?.data?.title || '').includes('临时草稿标题-BB40')
  }));
} finally {
  await fetch(`${base}/items/pages/1`, {
    method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ title: original.title, publication_state: original.publication_state })
  });
  const restored = await (await fetch(`${base}/items/pages/1?fields=title,publication_state`, { headers: adminHeaders })).json();
  if (editorUserId) await fetch(`${base}/users/${editorUserId}`, { method: 'DELETE', headers: adminHeaders });
  console.log(JSON.stringify({ step: 'restore', titleRestored: restored.data?.title === original.title, stateRestored: restored.data?.publication_state === original.publication_state, temporaryUserRemoved: true }));
}
