import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const cms = 'http://127.0.0.1:8055';
const website = 'http://127.0.0.1:4175';
async function request(url, init = {}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(20000) });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(`${init.method || 'GET'} ${new URL(url).pathname}: ${response.status} ${JSON.stringify(body?.errors || [])}`);
  }
  return response.status === 204 ? null : response.json();
}

export async function verifyNewsCover({ verifyWorkbench, sourceImage = new URL('../../website/public/assets/_video-end-298.png', import.meta.url) } = {}) {
  const settings = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8')).split(/\r?\n/).flatMap(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    return match ? [[match[1].trim(), match[2]]] : [];
  }));
  const login = await request(`${cms}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: settings.ADMIN_EMAIL, password: settings.ADMIN_PASSWORD }) });
  const authorization = `Bearer ${login.data.access_token}`;
  const headers = { authorization, 'content-type': 'application/json' };
  const marker = `cover-e2e-${randomUUID()}`;
  let fileId, assetId, articleId;
  const cookies = [];
  try {
    const bytes = await readFile(sourceImage);
    const form = new FormData();
    form.set('file', new Blob([bytes], { type: 'image/png' }), `${marker}.png`);
    const upload = await request(`${cms}/files`, { method: 'POST', headers: { authorization }, body: form });
    fileId = upload.data.id;
    const asset = await request(`${cms}/items/media_assets`, { method: 'POST', headers, body: JSON.stringify({
      file_id: fileId, original_file_name: `${marker}.png`, mime_type: 'image/png', byte_size: bytes.length,
      usage_scope: 'article', media_type: 'image', width: 1920, height: 1080, aspect_ratio: '16:9',
      placement_key: 'news.dynamic_news.cover', page_key: 'news', section_key: 'dynamic-news',
      title: marker, alt_text: marker, copyright_status: 'pending_review', authorization_note: 'Temporary local test',
      enabled: true, status: 'draft', publication_state: 'unpublished'
    }) });
    assetId = String(asset.data.id);
    const article = await request(`${cms}/items/articles`, { method: 'POST', headers, body: JSON.stringify({
      slug: marker, title: marker, category: 'news', display_date: '2026-09-09', body: `<p>${marker}</p>`,
      cover_asset: assetId, media: [], status: 'draft', publication_state: 'unpublished'
    }) });
    articleId = String(article.data.id);
    for (let iteration = 0; iteration < 2; iteration++) {
      const saved = await request(`${cms}/items/articles/${articleId}?fields=id,cover_asset,status`, { headers });
      assert.equal(String(saved.data.cover_asset), assetId);
      const issued = await request(`${cms}/content-preview-tokens/issue`, { method: 'POST', headers, body: JSON.stringify({ contentCollection: 'articles', contentItemId: articleId, ttlSeconds: 120 }) });
      const open = await fetch(`${website}/api/preview/open`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: issued.data.token, sectionKey: 'dynamic-news' }), signal: AbortSignal.timeout(20000) });
      assert.equal(open.status, 303);
      const cookie = open.headers.get('set-cookie').split(';')[0];
      cookies.push(cookie);
      const session = await request(`${website}/api/preview/session`, { headers: { cookie } });
      assert.equal(session.data.preview.cover_asset, `/api/preview/media/${assetId}`);
      assert.equal(String(session.data.preview.cover_media_asset_id), assetId);
      const media = await fetch(`${website}/api/preview/media/${assetId}`, { headers: { cookie }, signal: AbortSignal.timeout(20000) });
      assert.equal(media.status, 200);
      assert.deepEqual(Buffer.from(await media.arrayBuffer()), bytes);
      const page = await fetch(new URL(open.headers.get('location'), website), { headers: { cookie }, signal: AbortSignal.timeout(20000) });
      assert.equal(page.status, 200);
      const html = await page.text();
      assert.ok(html.includes(marker), 'preview contains the temporary news card');
      assert.ok(html.includes(`/api/preview/media/${assetId}`), 'preview contains the protected cover');
    }
    if (verifyWorkbench) await verifyWorkbench({ articleId, assetId, marker, settings });
    const publicList = await request(`${website}/api/public/v1/articles`);
    assert.ok(!JSON.stringify(publicList).includes(marker), 'public list does not expose the private draft article');
    console.log(JSON.stringify({ articleId, assetId, uploadBytesVerified: true, reopenedPreview: true, publicDraftExcluded: true }));
  } finally {
    for (const cookie of cookies) await request(`${website}/api/preview/session`, { method: 'DELETE', headers: { cookie } });
    for (const [collection, id] of [['items/articles', articleId], ['items/media_assets', assetId], ['files', fileId]]) {
      if (!id) continue;
      await request(`${cms}/${collection}/${id}`, { method: 'DELETE', headers });
      const remaining = await request(`${cms}/${collection}?filter[id][_eq]=${encodeURIComponent(id)}&fields=id`, { headers });
      assert.deepEqual(remaining.data, [], `temporary ${collection} was not removed`);
    }
    console.log(JSON.stringify({ temporaryDataCleaned: true }));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyNewsCover().catch(error => { console.error(error.message); process.exitCode = 1; });
}
