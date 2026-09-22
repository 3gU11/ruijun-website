import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const sourceVideo = new URL('../../website/public/assets/hero-clean.mp4', import.meta.url);
const sourcePoster = new URL('../../website/public/assets/home-intro-end-hd.png', import.meta.url);

function readEnvironment(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    return match ? [[match[1].trim(), match[2]]] : [];
  }));
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* surfaced by the status assertion */ }
  if (!response.ok) throw new Error(`${init.method || 'GET'} ${url} failed: ${response.status} ${text.slice(0, 500)}`);
  return body;
}

async function cleanupRequest(url, init) {
  try { await fetch(url, init); } catch { /* Preserve the original verification error. */ }
}

function previewCookie(response) {
  return (response.headers.getSetCookie?.()[0] || response.headers.get('set-cookie') || '').split(';')[0];
}

async function uploadFile({ authorization, bytes, type, filename, title }) {
  const form = new FormData();
  form.set('title', title);
  form.set('file', new Blob([bytes], { type }), filename);
  const uploaded = await requestJson(`${cmsUrl}/files`, {
    method: 'POST',
    headers: { authorization },
    body: form
  });
  assert.ok(uploaded?.data?.id, `Directus did not return a file id for ${filename}`);
  return uploaded.data;
}

async function main() {
  const env = readEnvironment(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  const login = await requestJson(`${cmsUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
  });
  const authorization = `Bearer ${login.data.access_token}`;
  const headers = { authorization, 'content-type': 'application/json' };
  const sourceKey = `visual-editing-service-tutorial-${Date.now()}`;
  let videoFileId = '';
  let posterFileId = '';
  let videoAssetId = '';
  let posterAssetId = '';
  let resourceId = '';

  try {
    const [videoBytes, posterBytes] = await Promise.all([readFile(sourceVideo), readFile(sourcePoster)]);
    const videoFile = await uploadFile({
      authorization,
      bytes: videoBytes,
      type: 'video/mp4',
      filename: 'hero-clean.mp4',
      title: 'TDD 服务教学视频临时验收'
    });
    videoFileId = String(videoFile.id);
    const posterFile = await uploadFile({
      authorization,
      bytes: posterBytes,
      type: 'image/png',
      filename: 'service-tutorial-poster.png',
      title: 'TDD 服务教学视频海报临时验收'
    });
    posterFileId = String(posterFile.id);

    const posterAsset = await requestJson(`${cmsUrl}/items/media_assets`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        file_id: posterFileId,
        original_file_name: 'service-tutorial-poster.png',
        mime_type: 'image/png',
        byte_size: posterBytes.byteLength,
        usage_scope: 'service',
        media_type: 'image',
        width: 1920,
        height: 1080,
        aspect_ratio: '16:9',
        placement_key: 'service.tutorial.poster',
        page_key: 'service',
        section_key: 'download',
        title: 'TDD 服务教学视频海报临时验收',
        description: '临时海报，仅用于 Visual Editing 验收。',
        alt_text: '服务教学视频临时海报',
        copyright_status: 'pending_review',
        authorization_note: 'TDD 临时验收',
        status: 'draft',
        publication_state: 'unpublished',
        enabled: true
      })
    });
    posterAssetId = String(posterAsset.data.id);
    assert.equal(posterAsset.data.placement_key, 'service.tutorial.poster');

    const videoAsset = await requestJson(`${cmsUrl}/items/media_assets`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        file_id: videoFileId,
        original_file_name: 'hero-clean.mp4',
        mime_type: 'video/mp4',
        byte_size: videoBytes.byteLength,
        usage_scope: 'service',
        media_type: 'video',
        width: 1920,
        height: 1080,
        duration_seconds: 11,
        aspect_ratio: '16:9',
        poster_asset_id: posterAssetId,
        placement_key: 'service.tutorial.video',
        page_key: 'service',
        section_key: 'video',
        title: 'TDD 服务教学视频临时验收',
        description: '临时视频，仅用于 Visual Editing 验收。',
        transcript: 'TDD 临时视频文字稿。',
        alt_text: '服务教学视频临时验收',
        copyright_status: 'pending_review',
        authorization_note: 'TDD 临时验收',
        status: 'draft',
        publication_state: 'unpublished',
        enabled: true,
        autoplay: false,
        muted: true,
        loop: false
      })
    });
    videoAssetId = String(videoAsset.data.id);
    assert.equal(videoAsset.data.placement_key, 'service.tutorial.video');
    assert.equal(String(videoAsset.data.poster_asset_id), posterAssetId);

    const resource = await requestJson(`${cmsUrl}/items/service_resources`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source_key: sourceKey,
        type: 'video',
        title: 'TDD 服务教学视频临时验收',
        summary: '临时视频资料，仅用于 Visual Editing 验收。',
        body: '服务教学视频预览闭环验收。',
        applicable_models: ['FR400XS'],
        version: 'TDD',
        language: 'zh-CN',
        asset: videoAssetId,
        cover_asset: posterAssetId,
        display_date: '2026-09-03',
        sort_order: 0,
        status: 'draft',
        publication_state: 'unpublished'
      })
    });
    resourceId = String(resource.data.id);

    const persisted = await requestJson(`${cmsUrl}/items/service_resources/${encodeURIComponent(resourceId)}?fields=id,source_key,type,asset,cover_asset,status,publication_state`, { headers });
    assert.equal(String(persisted.data.asset), videoAssetId);
    assert.equal(String(persisted.data.cover_asset), posterAssetId);
    assert.equal(persisted.data.status, 'draft');
    assert.equal(persisted.data.publication_state, 'unpublished');

    const issued = await requestJson(`${cmsUrl}/content-preview-tokens/issue`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ contentCollection: 'service_resources', contentItemId: resourceId, ttlSeconds: 120 })
    });
    assert.ok(issued?.data?.token, 'CMS did not issue a preview token');

    const handoff = await fetch(`${websiteUrl}/api/preview/open`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: issued.data.token })
    });
    assert.equal(handoff.status, 303, 'Nuxt did not accept the service tutorial preview token');
    const location = new URL(handoff.headers.get('location'), websiteUrl);
    assert.equal(location.pathname, '/service/video');
    const cookie = previewCookie(handoff);
    assert.match(cookie, /^ruijun_preview_session=/, 'Nuxt did not create a preview cookie');

    const session = await requestJson(`${websiteUrl}/api/preview/session`, { headers: { cookie } });
    const previewResource = session.data.preview;
    assert.equal(String(previewResource.id), resourceId);
    assert.equal(String(previewResource.asset_media_asset_id), videoAssetId);
    assert.equal(String(previewResource.cover_media_asset_id), posterAssetId);
    assert.equal(previewResource.asset, `/api/preview/media/${videoAssetId}`);
    assert.equal(previewResource.cover_asset, `/api/preview/media/${posterAssetId}`);

    const [videoResponse, posterResponse] = await Promise.all([
      fetch(`${websiteUrl}/api/preview/media/${encodeURIComponent(videoAssetId)}`, { headers: { cookie } }),
      fetch(`${websiteUrl}/api/preview/media/${encodeURIComponent(posterAssetId)}`, { headers: { cookie } })
    ]);
    assert.equal(videoResponse.status, 200, 'protected tutorial video did not respond');
    assert.equal(posterResponse.status, 200, 'protected tutorial poster did not respond');
    assert.match(videoResponse.headers.get('content-type') || '', /^video\/mp4/);
    assert.match(posterResponse.headers.get('content-type') || '', /^image\/png/);
    assert.equal((await videoResponse.arrayBuffer()).byteLength, videoBytes.byteLength);
    assert.equal((await posterResponse.arrayBuffer()).byteLength, posterBytes.byteLength);

    const pageResponse = await fetch(`${websiteUrl}/service/video?cmsPreview=1`, { headers: { cookie } });
    const html = await pageResponse.text();
    assert.equal(pageResponse.status, 200, `service video preview failed: ${html.slice(0, 1000)}`);
    assert.ok(html.includes(`/api/preview/media/${videoAssetId}`), 'service video preview did not render the protected video path');
    assert.ok(html.includes(`/api/preview/media/${posterAssetId}`), 'service video preview did not render the protected poster path');
    assert.ok(html.includes(`data-cms-preview-key="${sourceKey}"`), 'service video preview did not identify the selected resource');

    const publicResponse = await fetch(`${websiteUrl}/api/public/v1/service-resources`);
    const publicText = await publicResponse.text();
    assert.ok(!publicText.includes(sourceKey), 'unpublished service tutorial leaked into public API');
    console.log(JSON.stringify({
      resourceId,
      videoAssetId,
      posterAssetId,
      previewPath: `${location.pathname}${location.search}`,
      protectedVideoStatus: videoResponse.status,
      protectedPosterStatus: posterResponse.status,
      publicLeaked: false,
      previewTokenIssued: true
    }));
  } finally {
    const deleteHeaders = { authorization };
    if (resourceId) await cleanupRequest(`${cmsUrl}/items/service_resources/${encodeURIComponent(resourceId)}`, { method: 'DELETE', headers: deleteHeaders });
    if (videoAssetId) await cleanupRequest(`${cmsUrl}/items/media_assets/${encodeURIComponent(videoAssetId)}`, { method: 'DELETE', headers: deleteHeaders });
    if (posterAssetId) await cleanupRequest(`${cmsUrl}/items/media_assets/${encodeURIComponent(posterAssetId)}`, { method: 'DELETE', headers: deleteHeaders });
    if (videoFileId) await cleanupRequest(`${cmsUrl}/files/${encodeURIComponent(videoFileId)}`, { method: 'DELETE', headers: deleteHeaders });
    if (posterFileId) await cleanupRequest(`${cmsUrl}/files/${encodeURIComponent(posterFileId)}`, { method: 'DELETE', headers: deleteHeaders });
    if (resourceId || videoAssetId || posterAssetId || videoFileId || posterFileId) {
      console.log(JSON.stringify({ resourceId: resourceId || null, temporaryMediaCleaned: true, restored: true }));
    }
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
