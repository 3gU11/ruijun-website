import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { paginateNews, sortNewsByDisplayDate, splitNewsArticles } from '../../website/shared/news-listing.mjs';
import { resolvePublicationWorkflowRoles } from './publication-e2e-roles.mjs';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const recordCount = 7;

function parseEnv(source) {
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

function headers(token) {
  return { authorization: `Bearer ${token}`, accept: 'application/json', 'content-type': 'application/json' };
}

async function createTemporaryUser(token, roleId, marker, label) {
  const idToken = randomUUID();
  const password = `E2E-${randomUUID()}-Aa1!`;
  const email = `${marker.slice(0, 24)}.${label}@example.com`;
  const result = await json(`${cmsUrl}/users`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({ email, password, role: roleId, token: idToken, status: 'active', first_name: 'CMS', last_name: 'Pagination E2E' })
  });
  return { id: String(result.data.id), token: idToken };
}

async function main() {
  const env = parseEnv(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  const login = await json(`${cmsUrl}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
  });
  const token = login.data.access_token;
  const auth = headers(token);
  const marker = `cms-pagination-e2e-${randomUUID()}`;
  const created = [];
  const createdUsers = [];
  let mediaAssetId = null;
  let fileId = null;
  try {
    const roles = await json(`${cmsUrl}/roles?fields=id,name&limit=-1`, { headers: auth });
    const { editorRoleId, reviewerRoleId, publisherRoleId } = resolvePublicationWorkflowRoles(roles.data);
    const editor = await createTemporaryUser(token, editorRoleId, marker, 'editor');
    const reviewer = await createTemporaryUser(token, reviewerRoleId, marker, 'reviewer');
    const publisher = await createTemporaryUser(token, publisherRoleId, marker, 'publisher');
    createdUsers.push(editor.id, reviewer.id, publisher.id);
    const editorHeaders = headers(editor.token);
    const reviewerHeaders = headers(reviewer.token);
    const publisherHeaders = headers(publisher.token);
    const imageBytes = await readFile(new URL('../../website/public/assets/home-intro.mp4', import.meta.url));
    const form = new FormData();
    form.append('file', new Blob([imageBytes], { type: 'video/mp4' }), 'pagination-e2e.mp4');
    const upload = await fetch(`${cmsUrl}/files`, { method: 'POST', headers: { authorization: `Bearer ${token}`, accept: 'application/json' }, body: form });
    const uploadBody = await upload.json();
    if (!upload.ok) throw new Error(`POST ${cmsUrl}/files failed`);
    fileId = String(uploadBody.data.id);
    const media = await json(`${cmsUrl}/items/media_assets`, { method: 'POST', headers: editorHeaders, body: JSON.stringify({
      file_id: fileId, original_file_name: uploadBody.data.filename_download, mime_type: 'video/mp4',
      byte_size: Number(uploadBody.data.filesize), usage_scope: 'article', media_type: 'video',
      width: 1920, height: 1080, duration_seconds: 11, placement_key: 'news.video_share.list',
      enabled: true, alt_text: 'Pagination E2E', copyright_status: 'owned', authorization_note: 'Temporary local E2E fixture.',
      source_document: marker, status: 'draft', publication_state: 'unpublished'
    })});
    mediaAssetId = String(media.data.id);
    await json(`${cmsUrl}/items/media_assets/${mediaAssetId}`, { method: 'PATCH', headers: editorHeaders, body: JSON.stringify({ status: 'review' }) });
    await json(`${cmsUrl}/items/media_assets/${mediaAssetId}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ status: 'scheduled' }) });
    await json(`${cmsUrl}/items/media_assets/${mediaAssetId}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ status: 'published' }) });
    for (const category of ['news', 'video']) {
      for (let index = 0; index < recordCount; index += 1) {
        const day = String(index + 1).padStart(2, '0');
        const slug = `${marker}-${category}-${index + 1}`;
        const item = await json(`${cmsUrl}/items/articles`, {
          method: 'POST', headers: editorHeaders,
          body: JSON.stringify({
            slug, category, title: `${marker} ${category} ${index + 1}`,
            summary: `${marker} summary`, body: `<p>${marker} body ${index + 1}</p>`,
            display_date: `2026-09-${day}`,
            video_url: category === 'video' ? '/assets/home-intro.mp4' : '',
            cover_asset: mediaAssetId, seo: { title: `${marker} ${category} ${index + 1}` },
            source_document: marker, status: 'draft', publication_state: 'unpublished'
          })
        });
        const id = String(item.data.id);
        created.push(id);
        const submitted = await json(`${cmsUrl}/items/articles/${id}`, {
          method: 'PATCH', headers: editorHeaders,
          body: JSON.stringify({ status: 'review' })
        });
        assert.equal(submitted.data.status, 'review');
        const approved = await json(`${cmsUrl}/items/articles/${id}`, {
          method: 'PATCH', headers: reviewerHeaders,
          body: JSON.stringify({ status: 'scheduled' })
        });
        assert.equal(approved.data.status, 'scheduled');
        const next = await json(`${cmsUrl}/items/articles/${id}`, {
          method: 'PATCH', headers: publisherHeaders,
          body: JSON.stringify({ status: 'published' })
        });
        assert.equal(next.data.status, 'published');
        assert.equal(next.data.publication_state, 'published');
      }
    }

    const publishedProbe = await json(`${cmsUrl}/items/articles?filter[source_document][_eq]=${encodeURIComponent(marker)}&filter[status][_eq]=published&filter[publication_state][_eq]=published&limit=100&fields=id,slug,status,publication_state`, { headers: auth });
    assert.equal(publishedProbe.data.length, recordCount * 2, 'Directus published probe did not return all temporary records');
    const publicList = await json(`${websiteUrl}/api/public/v1/articles`, { headers: { accept: 'application/json' } });
    const selected = publicList.data.filter((item) => String(item.slug || '').startsWith(marker));
    assert.equal(selected.length, recordCount * 2, 'public API did not return all published temporary records');
    const split = splitNewsArticles(selected);
    assert.deepEqual(split.articles.map((item) => item.display_date), [
      '2026-09-07', '2026-09-06', '2026-09-05', '2026-09-04', '2026-09-03', '2026-09-02', '2026-09-01'
    ]);
    assert.deepEqual(split.videoShares.map((item) => item.display_date), [
      '2026-09-07', '2026-09-06', '2026-09-05', '2026-09-04', '2026-09-03', '2026-09-02', '2026-09-01'
    ]);
    for (const records of [sortNewsByDisplayDate(split.articles), sortNewsByDisplayDate(split.videoShares)]) {
      const first = paginateNews(records, 1, 6);
      const second = paginateNews(records, 2, 6);
      assert.equal(first.items.length, 6);
      assert.equal(first.pageCount, 2);
      assert.equal(second.items.length, 1);
      assert.equal(second.page, 2);
      assert.equal(second.items[0].display_date, '2026-09-01');
      const detail = await json(`${websiteUrl}/api/public/v1/articles/${encodeURIComponent(second.items[0].slug)}`, { headers: { accept: 'application/json' } });
      assert.equal(detail.data.slug, second.items[0].slug, 'published detail route did not resolve the paginated record');
    }
    const draftProbe = await json(`${cmsUrl}/items/articles?filter[source_document][_eq]=${encodeURIComponent(marker)}&filter[status][_eq]=draft&filter[publication_state][_eq]=unpublished&limit=1`, { headers: auth });
    assert.equal(Array.isArray(draftProbe.data) ? draftProbe.data.length : 0, 0, 'temporary records unexpectedly remained drafts');
    console.log(JSON.stringify({ marker, dynamicNews: { pageSize: 6, pageCount: 2 }, videoShares: { pageSize: 6, pageCount: 2 }, detailRoutes: true }));
  } finally {
    for (const id of created) {
      await fetch(`${cmsUrl}/items/articles/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } });
    }
    if (mediaAssetId) await fetch(`${cmsUrl}/items/media_assets/${encodeURIComponent(mediaAssetId)}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } });
    if (fileId) await fetch(`${cmsUrl}/files/${encodeURIComponent(fileId)}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } });
    for (const id of createdUsers) {
      await fetch(`${cmsUrl}/users/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } });
    }
    const residual = await json(`${cmsUrl}/items/articles?filter[source_document][_eq]=${encodeURIComponent(marker)}&limit=100&fields=id`, { headers: auth });
    if (Array.isArray(residual.data) && residual.data.length) throw new Error('Temporary pagination articles were not fully cleaned');
    console.log(JSON.stringify({ marker, temporaryDataCleaned: true }));
  }
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
