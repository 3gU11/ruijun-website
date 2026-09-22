import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const qualificationId = '1';
const assetId = '113';

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function environment(source) { return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => { const match = line.match(/^([^#=]+)=(.*)$/); return match ? [[match[1].trim(), match[2]]] : []; })); }
async function requestJson(url, init = {}) { const response = await fetch(url, init); const body = await response.text(); if (!response.ok) throw new Error(`${init.method || 'GET'} ${url} failed: ${response.status} ${body.slice(0, 240)}`); return body ? JSON.parse(body) : null; }

async function main() {
  const env = environment(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  const login = await requestJson(`${cmsUrl}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }) });
  const headers = { authorization: `Bearer ${login.data.access_token}`, 'content-type': 'application/json' };
  let originalAssets;
  let saved = false;
  try {
    const [qualification, asset] = await Promise.all([
      requestJson(`${cmsUrl}/items/qualifications/${qualificationId}?fields=id,status,publication_state,name,assets`, { headers }),
      requestJson(`${cmsUrl}/items/media_assets/${assetId}?fields=id,usage_scope,placement_key,page_key,section_key,status,publication_state`, { headers })
    ]);
    assert.equal(qualification.data.status, 'draft');
    assert.equal(qualification.data.publication_state, 'unpublished');
    assert.equal(asset.data.usage_scope, 'qualification');
    assert.equal(asset.data.placement_key, 'qualification.image');
    assert.equal(asset.data.page_key, 'about');
    assert.equal(asset.data.section_key, 'certificates');
    assert.equal(asset.data.status, 'draft');
    assert.equal(asset.data.publication_state, 'unpublished');
    originalAssets = clone(qualification.data.assets || []);
    const originalAlt = String(originalAssets[0]?.alt || qualification.data.name || '').trim();
    await requestJson(`${cmsUrl}/items/qualifications/${qualificationId}`, { method: 'PATCH', headers, body: JSON.stringify({ assets: [{ alt: originalAlt, media_asset_id: assetId }] }) });
    saved = true;
    const persisted = await requestJson(`${cmsUrl}/items/qualifications/${qualificationId}?fields=id,assets`, { headers });
    assert.deepEqual(persisted.data.assets, [{ alt: originalAlt, media_asset_id: assetId }]);
    const issued = await requestJson(`${cmsUrl}/content-preview-tokens/issue`, { method: 'POST', headers, body: JSON.stringify({ contentCollection: 'qualifications', contentItemId: qualificationId, ttlSeconds: 120 }) });
    const handoff = await fetch(`${websiteUrl}/api/preview/open`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: issued.data.token, sectionKey: 'certificates' }) });
    assert.equal(handoff.status, 303);
    const location = new URL(handoff.headers.get('location'), websiteUrl);
    const cookie = (handoff.headers.getSetCookie?.()[0] || handoff.headers.get('set-cookie') || '').split(';')[0];
    assert.match(cookie, /^ruijun_preview_session=/);
    const session = await requestJson(`${websiteUrl}/api/preview/session`, { headers: { cookie } });
    const previewQualification = session.data.preview;
    assert.ok(previewQualification, 'preview session omitted qualification record');
    assert.deepEqual(previewQualification.assets, [{ alt: originalAlt, media_asset_id: assetId, path: `/api/preview/media/${assetId}`, managed: true }]);
    const html = await (await fetch(`${websiteUrl}${location.pathname}${location.search}`, { headers: { cookie } })).text();
    assert.match(html, new RegExp(`/api/preview/media/${assetId}`));
    assert.match(html, /data-cms-preview-placement-key="qualification\.image"/);
    console.log(JSON.stringify({ savedTo: `qualifications/${qualificationId}.assets.0`, mediaAssetId: assetId, rendered: true }));
  } finally {
    if (saved) {
      await requestJson(`${cmsUrl}/items/qualifications/${qualificationId}`, { method: 'PATCH', headers, body: JSON.stringify({ assets: originalAssets }) });
      const restored = await requestJson(`${cmsUrl}/items/qualifications/${qualificationId}?fields=id,assets`, { headers });
      assert.deepEqual(restored.data.assets, originalAssets);
      console.log(JSON.stringify({ qualificationId, restored: true }));
    }
  }
}
main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
