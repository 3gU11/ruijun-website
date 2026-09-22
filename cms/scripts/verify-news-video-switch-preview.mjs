import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const articleId = '36';
const sourceVideo = new URL('../../website/public/assets/home-intro.mp4', import.meta.url);

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function env(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    return match ? [[match[1].trim(), match[2]]] : [];
  }));
}
async function json(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* assertion below reports non-JSON responses */ }
  if (!response.ok) throw new Error(`${init.method || 'GET'} ${url} failed: ${response.status} ${text.slice(0, 500)}`);
  return body;
}

async function main() {
  const settings = env(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  const login = await json(`${cmsUrl}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: settings.ADMIN_EMAIL, password: settings.ADMIN_PASSWORD })
  });
  const authorization = `Bearer ${login.data.access_token}`;
  const headers = { authorization, accept: 'application/json', 'content-type': 'application/json' };
  let fileId = '';
  let assetId = '';
  let originalMedia;
  let patched = false;
  try {
    const original = await json(`${cmsUrl}/items/articles/${articleId}?fields=id,slug,status,publication_state,media`, { headers });
    assert.equal(String(original.data.id), articleId);
    assert.equal(original.data.status, 'draft');
    assert.ok(Array.isArray(original.data.media) && original.data.media.length, 'article must have an original governed video');
    originalMedia = clone(original.data.media);
    const originalAssetId = String(originalMedia[0]?.media_asset_id || '');
    assert.ok(originalAssetId, 'article original media must contain media_asset_id');

    const bytes = await readFile(sourceVideo);
    const form = new FormData();
    fileId = randomUUID();
    form.set('id', fileId);
    form.set('title', 'TDD 视频分享切换临时素材');
    form.set('file', new Blob([bytes], { type: 'video/mp4' }), 'home-intro-switch-test.mp4');
    const uploaded = await json(`${cmsUrl}/files`, {
      method: 'POST', headers: { authorization }, body: form
    });
    fileId = String(uploaded.data.id);
    const asset = await json(`${cmsUrl}/items/media_assets`, {
      method: 'POST', headers,
      body: JSON.stringify({
        file_id: fileId, original_file_name: uploaded.data.filename_download,
        mime_type: 'video/mp4', byte_size: Number(uploaded.data.filesize),
        usage_scope: 'article', media_type: 'video', width: 1920, height: 1080,
        duration_seconds: 11, aspect_ratio: '16:9', placement_key: 'news.video_share.list',
        page_key: 'news', section_key: 'video-sharing', title: 'TDD 视频分享切换临时素材',
        description: 'TDD 临时素材，仅用于验证视频切换。', alt_text: 'TDD 视频分享切换临时素材',
        copyright_status: 'pending_review', authorization_note: 'TDD 临时验收',
        status: 'draft', publication_state: 'unpublished', enabled: true,
        autoplay: false, muted: true, loop: false
      })
    });
    assetId = String(asset.data.id);
    assert.notEqual(assetId, originalAssetId, 'temporary video asset must differ from the original asset');

    await json(`${cmsUrl}/items/articles/${articleId}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ media: [{ media_asset_id: assetId }] })
    });
    patched = true;
    const persisted = await json(`${cmsUrl}/items/articles/${articleId}?fields=id,media`, { headers });
    assert.equal(String(persisted.data.media?.[0]?.media_asset_id), assetId, 'Directus did not persist the switched video');

    const issued = await json(`${cmsUrl}/content-preview-tokens/issue`, {
      method: 'POST', headers,
      body: JSON.stringify({ contentCollection: 'articles', contentItemId: articleId, ttlSeconds: 120 })
    });
    const handoff = await fetch(`${websiteUrl}/api/preview/open`, {
      method: 'POST', redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: issued.data.token, sectionKey: 'video-sharing' })
    });
    assert.equal(handoff.status, 303, 'Nuxt did not accept the video-share preview token');
    const location = new URL(handoff.headers.get('location'), websiteUrl);
    // Video-share canvas targets open the news listing so the preview bridge
    // can select the exact card by slug and keep the existing website route.
    assert.equal(location.pathname, '/news');
    const cookie = (handoff.headers.getSetCookie?.()[0] || handoff.headers.get('set-cookie') || '').split(';')[0];
    assert.match(cookie, /^ruijun_preview_session=/);
    const session = await json(`${websiteUrl}/api/preview/session`, { headers: { cookie } });
    assert.equal(String(session.data.preview.media?.[0]?.media_asset_id), assetId);
    assert.equal(session.data.preview.media?.[0]?.path, `/api/preview/media/${assetId}`);
    const mediaResponse = await fetch(`${websiteUrl}/api/preview/media/${encodeURIComponent(assetId)}`, { headers: { cookie } });
    assert.equal(mediaResponse.status, 200);
    assert.match(mediaResponse.headers.get('content-type') || '', /video\/mp4/);
    const htmlResponse = await fetch(`${websiteUrl}${location.pathname}${location.search}`, { headers: { cookie } });
    const html = await htmlResponse.text();
    assert.equal(htmlResponse.status, 200, `video-share detail preview failed: ${html.slice(0, 500)}`);
    assert.match(html, /data-cms-preview-key="video-sharing"/);
    console.log(JSON.stringify({ articleId, originalAssetId, switchedAssetId: assetId, previewPath: `${location.pathname}${location.search}`, mediaStatus: mediaResponse.status, rendered: true }));
  } finally {
    if (patched) {
      const current = await json(`${cmsUrl}/items/articles/${articleId}?fields=id,media`, { headers });
      assert.equal(String(current.data.media?.[0]?.media_asset_id), assetId, 'article changed during verification; refusing to overwrite it');
      await json(`${cmsUrl}/items/articles/${articleId}`, { method: 'PATCH', headers, body: JSON.stringify({ media: originalMedia }) });
      const restored = await json(`${cmsUrl}/items/articles/${articleId}?fields=id,media`, { headers });
      assert.deepEqual(restored.data.media, originalMedia, 'original video reference was not restored');
    }
    if (assetId) await fetch(`${cmsUrl}/items/media_assets/${encodeURIComponent(assetId)}`, { method: 'DELETE', headers: { authorization } });
    if (fileId) await fetch(`${cmsUrl}/files/${encodeURIComponent(fileId)}`, { method: 'DELETE', headers: { authorization } });
    if (patched) console.log(JSON.stringify({ articleId, restored: true, temporaryMediaCleaned: true }));
  }
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
