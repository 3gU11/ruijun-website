import { readFile } from 'node:fs/promises';

// Live check of two fixes:
//   1. setting publication_state alone must fail loudly instead of returning 200
//   2. an administrator can now submit a draft for review
// The record is returned to draft afterwards via the version endpoint, which
// also exercises the new discard confirmation.
const env = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8')).split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/); return match ? [[match[1].trim(), match[2]]] : [];
}));
const base = 'http://127.0.0.1:8055';
const assetId = process.argv[2] || '92';

const login = await fetch(`${base}/auth/login`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
});
const token = (await login.json())?.data?.access_token;
if (!token) throw new Error('login failed');
const headers = { 'content-type': 'application/json', authorization: `Bearer ${token}` };

const read = async () => (await (await fetch(`${base}/items/media_assets/${assetId}?fields=id,title,status,publication_state`, { headers })).json()).data;
const before = await read();
console.log(JSON.stringify({ step: 'baseline', ...before }));

// 1. publication_state on its own.
const silent = await fetch(`${base}/items/media_assets/${assetId}`, {
  method: 'PATCH', headers, body: JSON.stringify({ publication_state: 'published' })
});
const silentBody = await silent.json().catch(() => ({}));
const afterSilent = await read();
console.log(JSON.stringify({
  step: 'publication-state-only',
  httpStatus: silent.status,
  message: silentBody?.errors?.[0]?.message || '',
  stateUnchanged: afterSilent.status === before.status && afterSilent.publication_state === before.publication_state,
  noFalseSuccess: silent.status !== 200
}));

// 2. administrator submits the draft for review.
const review = await fetch(`${base}/items/media_assets/${assetId}`, {
  method: 'PATCH', headers, body: JSON.stringify({ status: 'review' })
});
const reviewBody = await review.json().catch(() => ({}));
const afterReview = await read();
console.log(JSON.stringify({
  step: 'admin-submit-review',
  httpStatus: review.status,
  message: reviewBody?.errors?.[0]?.message || '',
  status: afterReview.status
}));

// 3. put it back to draft; the first attempt must ask for confirmation.
const versions = (await (await fetch(`${base}/content-version-restore/?collection=media_assets&itemId=${assetId}`, { headers })).json()).data || [];
const target = versions[0];
if (!target) { console.log(JSON.stringify({ step: 'restore', status: 'no-version' })); process.exit(0); }
const guarded = await fetch(`${base}/content-version-restore/${target.id}/restore`, {
  method: 'POST', headers, body: JSON.stringify({ restoreNote: '回退验证造成的状态变更' })
});
const guardedBody = await guarded.json().catch(() => ({}));
console.log(JSON.stringify({ step: 'restore-guard', httpStatus: guarded.status, code: guardedBody?.errors?.[0]?.extensions?.code || '', newer: guardedBody?.errors?.[0]?.extensions?.newerVersions ?? null }));

const confirmed = await fetch(`${base}/content-version-restore/${target.id}/restore`, {
  method: 'POST', headers, body: JSON.stringify({ restoreNote: '回退验证造成的状态变更', confirmDiscardNewer: true })
});
const confirmedBody = await confirmed.json().catch(() => ({}));
const final = await read();
console.log(JSON.stringify({ step: 'restore-confirmed', httpStatus: confirmed.status, discarded: confirmedBody?.data?.discardedNewerVersions ?? null, finalStatus: final.status, finalState: final.publication_state }));
