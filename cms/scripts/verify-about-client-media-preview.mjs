import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const pageId = '2';
const cases = [
  { sectionId: 'clients-domestic', assetId: '103', role: 'domestic-1' },
  { sectionId: 'clients-global', assetId: '108', role: 'global-1' }
];

const clone = (value) => JSON.parse(JSON.stringify(value));
function environment(source) { return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => { const match = line.match(/^([^#=]+)=(.*)$/); return match ? [[match[1].trim(), match[2]]] : []; })); }
async function requestJson(url, init = {}) { const response = await fetch(url, init); const body = await response.text(); if (!response.ok) throw new Error(`${init.method || 'GET'} ${url} failed: ${response.status} ${body.slice(0, 240)}`); return body ? JSON.parse(body) : null; }
function sectionFor(sections, sectionId) { const section = sections.find((item) => item?.id === sectionId); assert.ok(section, `pages/${pageId} must contain ${sectionId}`); return section; }

async function main() {
  const env = environment(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  const login = await requestJson(`${cmsUrl}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }) });
  const headers = { authorization: `Bearer ${login.data.access_token}`, 'content-type': 'application/json' };
  for (const { sectionId, assetId, role } of cases) {
    const otherSectionId = cases.find((entry) => entry.sectionId !== sectionId).sectionId;
    let originalSections;
    let saved = false;
    try {
      const [page, asset] = await Promise.all([
        requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,status,publication_state,sections`, { headers }),
        requestJson(`${cmsUrl}/items/media_assets/${assetId}?fields=id,usage_scope,placement_key,page_key,section_key,status,publication_state`, { headers })
      ]);
      assert.equal(page.data.status, 'draft');
      assert.equal(page.data.publication_state, 'unpublished');
      assert.equal(asset.data.usage_scope, 'brand');
      assert.equal(asset.data.placement_key, 'about.client.image');
      assert.equal(asset.data.page_key, 'about');
      assert.equal(asset.data.section_key, sectionId);
      assert.equal(asset.data.status, 'draft');
      assert.equal(asset.data.publication_state, 'unpublished');
      originalSections = clone(page.data.sections || []);
      const sections = clone(originalSections);
      const section = sectionFor(sections, sectionId);
      const otherSnapshot = clone(sectionFor(sections, otherSectionId).media || []);
      section.media = Array.isArray(section.media) ? section.media : [];
      assert.equal(section.media.some((entry) => entry?.role === role), false, `verification requires empty ${role} baseline`);
      section.media.push({ role, media_asset_id: assetId });
      await requestJson(`${cmsUrl}/items/pages/${pageId}`, { method: 'PATCH', headers, body: JSON.stringify({ sections }) });
      saved = true;
      const persisted = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      assert.deepEqual(sectionFor(persisted.data.sections, sectionId).media.at(-1), { role, media_asset_id: assetId });
      assert.deepEqual(sectionFor(persisted.data.sections, otherSectionId).media, otherSnapshot);
      const issued = await requestJson(`${cmsUrl}/content-preview-tokens/issue`, { method: 'POST', headers, body: JSON.stringify({ contentCollection: 'pages', contentItemId: pageId, ttlSeconds: 120 }) });
      const handoff = await fetch(`${websiteUrl}/api/preview/open`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: issued.data.token, sectionKey: sectionId }) });
      assert.equal(handoff.status, 303);
      const location = new URL(handoff.headers.get('location'), websiteUrl);
      const cookie = (handoff.headers.getSetCookie?.()[0] || handoff.headers.get('set-cookie') || '').split(';')[0];
      assert.match(cookie, /^ruijun_preview_session=/);
      const session = await requestJson(`${websiteUrl}/api/preview/session`, { headers: { cookie } });
      assert.deepEqual(sectionFor(session.data.preview.sections, sectionId).media, [{ role, media_asset_id: assetId, path: `/api/preview/media/${assetId}`, managed: true }]);
      assert.deepEqual(sectionFor(session.data.preview.sections, otherSectionId).media, otherSnapshot);
      const html = await (await fetch(`${websiteUrl}${location.pathname}${location.search}`, { headers: { cookie } })).text();
      assert.match(html, new RegExp(`/api/preview/media/${assetId}`));
      assert.match(html, /data-cms-preview-placement-key="about\.client\.image"/);
      console.log(JSON.stringify({ savedTo: `pages/${pageId}.sections[${sectionId}].media.0`, protectedOtherSection: otherSectionId, mediaAssetId: assetId, rendered: true }));
    } finally {
      if (saved) {
        await requestJson(`${cmsUrl}/items/pages/${pageId}`, { method: 'PATCH', headers, body: JSON.stringify({ sections: originalSections }) });
        const restored = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
        assert.deepEqual(restored.data.sections, originalSections);
        console.log(JSON.stringify({ pageId, sectionId, restored: true }));
      }
    }
  }
}
main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
