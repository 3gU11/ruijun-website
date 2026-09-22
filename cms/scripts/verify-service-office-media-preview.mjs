import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const pageId = '3';
const sectionId = 'office-directory';
const regionRole = 'office-1';
const mapRole = 'office-map-1';
const regionAssetId = '317';
const mapAssetId = '316';

const clone = (value) => JSON.parse(JSON.stringify(value));
function parseEnv(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    return match ? [[match[1].trim(), match[2]]] : [];
  }));
}
async function json(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  if (!response.ok) throw new Error(`${init.method || 'GET'} ${url} failed: ${response.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
function sectionOf(sections) {
  const section = (sections || []).find((item) => item?.id === sectionId);
  assert.ok(section, `pages/${pageId} must contain ${sectionId}`);
  return section;
}
function mediaOf(section, role) {
  return (section.media || []).find((entry) => entry?.role === role);
}

async function main() {
  const env = parseEnv(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  const login = await json(`${cmsUrl}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
  });
  const headers = { authorization: `Bearer ${login.data.access_token}`, 'content-type': 'application/json' };
  let originalSections;
  let saved = false;
  try {
    const [page, regionAsset, mapAsset] = await Promise.all([
      json(`${cmsUrl}/items/pages/${pageId}?fields=id,status,publication_state,sections`, { headers }),
      json(`${cmsUrl}/items/media_assets/${regionAssetId}?fields=id,usage_scope,placement_key,page_key,section_key,status,publication_state`, { headers }),
      json(`${cmsUrl}/items/media_assets/${mapAssetId}?fields=id,usage_scope,placement_key,page_key,section_key,status,publication_state`, { headers })
    ]);
    assert.equal(regionAsset.data.usage_scope, 'service');
    assert.equal(regionAsset.data.placement_key, 'service.office.image');
    assert.equal(regionAsset.data.page_key, 'service');
    assert.equal(regionAsset.data.section_key, sectionId);
    assert.equal(mapAsset.data.placement_key, 'service.office.map');
    assert.equal(mapAsset.data.page_key, 'service');
    assert.equal(mapAsset.data.section_key, sectionId);

    originalSections = clone(page.data.sections || []);
    const sections = clone(originalSections);
    const section = sectionOf(sections);
    section.media = (section.media || []).filter((entry) => ![regionRole, mapRole].includes(entry?.role));
    section.media.push({ role: regionRole, media_asset_id: regionAssetId });
    section.media.push({ role: mapRole, media_asset_id: mapAssetId });
    await json(`${cmsUrl}/items/pages/${pageId}`, { method: 'PATCH', headers, body: JSON.stringify({ sections }) });
    saved = true;

    const persisted = await json(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
    const persistedSection = sectionOf(persisted.data.sections);
    assert.deepEqual(mediaOf(persistedSection, regionRole), { role: regionRole, media_asset_id: regionAssetId });
    assert.deepEqual(mediaOf(persistedSection, mapRole), { role: mapRole, media_asset_id: mapAssetId });

    const issued = await json(`${cmsUrl}/content-preview-tokens/issue`, {
      method: 'POST', headers,
      body: JSON.stringify({ contentCollection: 'pages', contentItemId: pageId, ttlSeconds: 120 })
    });
    const handoff = await fetch(`${websiteUrl}/api/preview/open`, {
      method: 'POST', redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: issued.data.token, sectionKey: sectionId })
    });
    assert.equal(handoff.status, 303);
    const location = new URL(handoff.headers.get('location'), websiteUrl);
    const cookie = (handoff.headers.getSetCookie?.()[0] || handoff.headers.get('set-cookie') || '').split(';')[0];
    assert.match(cookie, /^ruijun_preview_session=/);
    const session = await json(`${websiteUrl}/api/preview/session`, { headers: { cookie } });
    const previewSection = sectionOf(session.data.preview.sections);
    assert.deepEqual(mediaOf(previewSection, regionRole), { role: regionRole, media_asset_id: regionAssetId, path: `/api/preview/media/${regionAssetId}`, managed: true });
    assert.deepEqual(mediaOf(previewSection, mapRole), { role: mapRole, media_asset_id: mapAssetId, path: `/api/preview/media/${mapAssetId}`, managed: true });
    const html = await (await fetch(`${websiteUrl}${location.pathname}${location.search}`, { headers: { cookie } })).text();
    assert.match(html, new RegExp(`/api/preview/media/${regionAssetId}`));
    assert.match(html, new RegExp(`/api/preview/media/${mapAssetId}`));
    assert.match(html, /data-cms-preview-placement-key="service\.office\.image"/);
    assert.match(html, /data-cms-preview-placement-key="service\.office\.map"/);
    console.log(JSON.stringify({ savedTo: `pages/${pageId}.sections[${sectionId}].media`, regionAssetId, mapAssetId, rendered: true }));
  } finally {
    if (saved) {
      const current = await json(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      const currentSection = sectionOf(current.data.sections);
      assert.deepEqual(mediaOf(currentSection, regionRole), { role: regionRole, media_asset_id: regionAssetId });
      assert.deepEqual(mediaOf(currentSection, mapRole), { role: mapRole, media_asset_id: mapAssetId });
      await json(`${cmsUrl}/items/pages/${pageId}`, { method: 'PATCH', headers, body: JSON.stringify({ sections: originalSections }) });
      const restored = await json(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      assert.deepEqual(restored.data.sections, originalSections);
      console.log(JSON.stringify({ pageId, sectionId, restored: true }));
    }
  }
}
main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
