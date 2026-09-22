import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const pageId = '1';
const sectionId = 'performance';
const mediaRole = 'foreground';
const assetId = '89';

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function environment(source) { return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => { const match = line.match(/^([^#=]+)=(.*)$/); return match ? [[match[1].trim(), match[2]]] : []; })); }
async function requestJson(url, init = {}) { const response = await fetch(url, init); const text = await response.text(); if (!response.ok) throw new Error(`${init.method || 'GET'} ${url} failed: ${response.status} ${text.slice(0, 240)}`); return text ? JSON.parse(text) : null; }
function sectionFor(sections) { const section = sections.find((item) => item?.id === sectionId); assert.ok(section, `pages/${pageId} must contain ${sectionId}`); return section; }

async function main() {
  const env = environment(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  const login = await requestJson(`${cmsUrl}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }) });
  const headers = { authorization: `Bearer ${login.data.access_token}`, 'content-type': 'application/json' };
  let originalSections; let saved = false;
  try {
    const [page, asset] = await Promise.all([
      requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,status,publication_state,sections`, { headers }),
      requestJson(`${cmsUrl}/items/media_assets/${assetId}?fields=id,usage_scope,placement_key,page_key,section_key,status,publication_state`, { headers })
    ]);
    assert.equal(page.data.status, 'draft'); assert.equal(page.data.publication_state, 'unpublished');
    assert.equal(asset.data.usage_scope, 'homepage'); assert.equal(asset.data.placement_key, 'home.reason.machine');
    assert.equal(asset.data.page_key, 'home'); assert.equal(asset.data.section_key, sectionId);
    assert.equal(asset.data.status, 'draft'); assert.equal(asset.data.publication_state, 'unpublished');
    originalSections = clone(page.data.sections || []); const sections = clone(originalSections); const section = sectionFor(sections);
    section.media = Array.isArray(section.media) ? section.media : [];
    assert.equal(section.media.some((entry) => entry?.role === mediaRole), false, 'verification requires the empty reason foreground baseline');
    section.media.push({ role: mediaRole, media_asset_id: assetId });
    await requestJson(`${cmsUrl}/items/pages/${pageId}`, { method: 'PATCH', headers, body: JSON.stringify({ sections }) }); saved = true;
    const persisted = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
    assert.deepEqual(sectionFor(persisted.data.sections).media.at(-1), { role: mediaRole, media_asset_id: assetId });
    const issued = await requestJson(`${cmsUrl}/content-preview-tokens/issue`, { method: 'POST', headers, body: JSON.stringify({ contentCollection: 'pages', contentItemId: pageId, ttlSeconds: 120 }) });
    const handoff = await fetch(`${websiteUrl}/api/preview/open`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: issued.data.token, sectionKey: sectionId }) });
    assert.equal(handoff.status, 303); const location = new URL(handoff.headers.get('location'), websiteUrl); const cookie = (handoff.headers.getSetCookie?.()[0] || handoff.headers.get('set-cookie') || '').split(';')[0]; assert.match(cookie, /^ruijun_preview_session=/);
    const session = await requestJson(`${websiteUrl}/api/preview/session`, { headers: { cookie } });
    const previewMedia = sectionFor(session.data.preview.sections).media;
    const expectedPreviewMedia = sectionFor(originalSections).media.map((entry) => ({
      ...entry, path: `/api/preview/media/${entry.media_asset_id}`, managed: true
    }));
    expectedPreviewMedia.push({ role: mediaRole, media_asset_id: assetId, path: `/api/preview/media/${assetId}`, managed: true });
    assert.deepEqual(previewMedia, expectedPreviewMedia);
    const html = await (await fetch(`${websiteUrl}${location.pathname}${location.search}`, { headers: { cookie } })).text();
    assert.match(html, new RegExp(`/api/preview/media/${assetId}`)); assert.match(html, /data-cms-preview-placement-key="home\.reason\.machine"/);
    console.log(JSON.stringify({ savedTo: `pages/${pageId}.sections[${sectionId}].media.0`, mediaAssetId: assetId, previewPath: `${location.pathname}${location.search}`, rendered: true }));
  } finally {
    if (saved) {
      const current = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      assert.deepEqual(sectionFor(current.data.sections).media.at(-1), { role: mediaRole, media_asset_id: assetId });
      await requestJson(`${cmsUrl}/items/pages/${pageId}`, { method: 'PATCH', headers, body: JSON.stringify({ sections: originalSections }) });
      const restored = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers }); assert.deepEqual(restored.data.sections, originalSections);
      console.log(JSON.stringify({ pageId, sectionId, restored: true }));
    }
  }
}
main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
