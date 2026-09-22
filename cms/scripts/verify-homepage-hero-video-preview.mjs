import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const pageId = '1';
const sectionId = 'hero';
const sourceVideo = new URL('../../website/public/assets/home-intro.mp4', import.meta.url);

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function environment(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    return match ? [[match[1].trim(), match[2]]] : [];
  }));
}
async function requestJson(url, init = {}) {
  const response = await fetch(url, init);
  const body = await response.text();
  if (!response.ok) throw new Error(`${init.method || 'GET'} ${url} failed: ${response.status} ${body.slice(0, 240)}`);
  return body ? JSON.parse(body) : null;
}
function sectionFor(sections) {
  const section = sections.find((item) => item?.id === sectionId);
  assert.ok(section, `pages/${pageId} must contain ${sectionId}`);
  return section;
}
async function main() {
  const env = environment(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  const login = await requestJson(`${cmsUrl}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
  });
  const headers = { authorization: `Bearer ${login.data.access_token}`, accept: 'application/json' };
  let originalSections;
  let fileId = randomUUID();
  let assetId = null;
  let saved = false;
  try {
    const [page, bytes, poster] = await Promise.all([
      requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,status,publication_state,sections`, { headers }),
      readFile(sourceVideo),
      requestJson(`${cmsUrl}/items/media_assets/48?fields=id,status,publication_state,media_type,placement_key`, { headers })
    ]);
    assert.equal(page.data.status, 'draft');
    assert.equal(page.data.publication_state, 'unpublished');
    assert.equal(String(poster.data.id), '48');
    assert.equal(poster.data.media_type, 'image');
    const form = new FormData();
    form.set('id', fileId);
    form.set('title', 'TDD 首页首屏视频临时验收');
    form.set('file', new Blob([bytes], { type: 'video/mp4' }), 'home-intro.mp4');
    const uploaded = await requestJson(`${cmsUrl}/files`, { method: 'POST', headers: { authorization: headers.authorization }, body: form });
    assert.equal(String(uploaded.data.id), fileId);
    fileId = uploaded.data.id;
    const created = await requestJson(`${cmsUrl}/items/media_assets`, {
      method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ file_id: fileId, original_file_name: 'home-intro.mp4', mime_type: 'video/mp4', byte_size: bytes.byteLength,
        usage_scope: 'homepage', media_type: 'video', width: 1920, height: 1080, duration_seconds: 11, placement_key: 'home.hero.video',
        page_key: 'home', section_key: sectionId, poster_asset_id: poster.data.id, title: 'TDD 首页首屏视频临时验收', description: '临时视频，仅用于 Visual Editing 验收。',
        alt_text: '首页首屏视频临时验收', copyright_status: 'pending_review', authorization_note: 'TDD 临时验收', status: 'draft',
        publication_state: 'unpublished', enabled: true, autoplay: true, muted: true, loop: true })
    });
    assetId = created.data.id;
    assert.equal(created.data.placement_key, 'home.hero.video');
    originalSections = clone(page.data.sections || []);
    const sections = clone(originalSections);
    sectionFor(sections).hero_video_asset_id = String(assetId);
    await requestJson(`${cmsUrl}/items/pages/${pageId}`, { method: 'PATCH', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ sections }) });
    saved = true;
    const persisted = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
    assert.equal(String(sectionFor(persisted.data.sections).hero_video_asset_id), String(assetId));
    const issued = await requestJson(`${cmsUrl}/content-preview-tokens/issue`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ contentCollection: 'pages', contentItemId: pageId, ttlSeconds: 120 }) });
    const handoff = await fetch(`${websiteUrl}/api/preview/open`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: issued.data.token, sectionKey: sectionId }) });
    assert.equal(handoff.status, 303, 'Nuxt did not accept the preview token');
    const location = new URL(handoff.headers.get('location'), websiteUrl);
    const cookie = (handoff.headers.getSetCookie?.()[0] || handoff.headers.get('set-cookie') || '').split(';')[0];
    assert.match(cookie, /^ruijun_preview_session=/, 'Nuxt did not create a preview cookie');
    const session = await requestJson(`${websiteUrl}/api/preview/session`, { headers: { cookie } });
    const previewHero = sectionFor(session.data.preview.sections);
    assert.equal(String(previewHero.hero_video_asset_id), String(assetId));
    assert.equal(previewHero.hero_video_asset_url, `/api/preview/media/${assetId}`);
    const mediaResponse = await fetch(`${websiteUrl}/api/preview/media/${assetId}`, { headers: { cookie } });
    assert.equal(mediaResponse.status, 200);
    assert.match(mediaResponse.headers.get('content-type') || '', /video\/mp4/);
    assert.equal((await mediaResponse.arrayBuffer()).byteLength, bytes.byteLength);
    const html = await (await fetch(`${websiteUrl}${location.pathname}${location.search}`, { headers: { cookie } })).text();
    assert.match(html, new RegExp(`/api/preview/media/${assetId}`));
    assert.match(html, /data-cms-preview-placement-key="home\.hero\.video"/);
    console.log(JSON.stringify({ savedTo: `pages/${pageId}.sections[${sectionId}].hero_video_asset_id`, mediaAssetId: assetId, previewPath: `${location.pathname}${location.search}`, mediaStatus: mediaResponse.status, rendered: true }));
  } finally {
    if (saved) {
      const current = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      assert.equal(String(sectionFor(current.data.sections).hero_video_asset_id), String(assetId), 'hero video changed during verification; refusing to overwrite it');
      await requestJson(`${cmsUrl}/items/pages/${pageId}`, { method: 'PATCH', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ sections: originalSections }) });
      const restored = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      assert.deepEqual(restored.data.sections, originalSections, 'homepage video was not restored');
    }
    if (assetId) await requestJson(`${cmsUrl}/items/media_assets/${encodeURIComponent(assetId)}`, { method: 'DELETE', headers });
    if (fileId) await requestJson(`${cmsUrl}/files/${encodeURIComponent(fileId)}`, { method: 'DELETE', headers });
    if (saved) console.log(JSON.stringify({ pageId, sectionId, restored: true, temporaryMediaCleaned: true }));
  }
}
main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
