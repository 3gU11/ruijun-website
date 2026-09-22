import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolvePublicationWorkflowRoles } from './publication-e2e-roles.mjs';

const cmsRoot = new URL('../', import.meta.url);

function required(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function localSettings() {
  const content = await readFile(new URL('.env.local', cmsRoot), 'utf8');
  return Object.fromEntries(content.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    return match ? [[match[1].trim(), match[2]]] : [];
  }));
}

async function websiteSettings() {
  try {
    const content = await readFile(new URL('../../website/.env.local', import.meta.url), 'utf8');
    return Object.fromEntries(content.split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      return match ? [[match[1].trim(), match[2]]] : [];
    }));
  } catch {
    return {};
  }
}

function client(baseUrl, token = '') {
  async function request(path, { method = 'GET', body, expected = [200] } = {}) {
    const response = await fetch(new URL(path.replace(/^\//, ''), `${baseUrl.replace(/\/$/, '')}/`), {
      method,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      // Directus delete endpoints intentionally return an empty response.
    }
    if (!expected.includes(response.status)) throw new Error(`${method} ${path} failed: ${payload?.errors?.[0]?.message || `HTTP ${response.status}`}`);
    return { status: response.status, data: payload?.data };
  }

  async function upload(path, form, expected = [200]) {
    const response = await fetch(new URL(path.replace(/^\//, ''), `${baseUrl.replace(/\/$/, '')}/`), {
      method: 'POST', headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: form
    });
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      // Handled below with the status code.
    }
    if (!expected.includes(response.status)) throw new Error(`POST ${path} failed: ${payload?.errors?.[0]?.message || `HTTP ${response.status}`}`);
    return { status: response.status, data: payload?.data };
  }

  return { request, upload };
}

async function createTestUser(admin, roleId, suffix, label) {
  const token = randomUUID();
  const created = await admin.request('/users', {
    method: 'POST',
    body: {
      email: `${suffix.slice(0, 12)}.${label}@example.com`, password: `E2E-${randomUUID()}-Aa1!`, role: roleId,
      token, status: 'active', first_name: 'E2E', last_name: 'Media Governance'
    }
  });
  return { id: created.data.id, token };
}

async function main() {
  const settings = await localSettings();
  const baseUrl = required(settings.CMS_BASE_URL || `http://${settings.HOST}:${settings.PORT}`, 'CMS_BASE_URL');
  const websiteApiBaseUrl = process.env.WEBSITE_PUBLIC_API_BASE_URL || '';
  const login = client(baseUrl);
  const session = await login.request('/auth/login', {
    method: 'POST', body: { email: required(settings.ADMIN_EMAIL, 'ADMIN_EMAIL'), password: required(settings.ADMIN_PASSWORD, 'ADMIN_PASSWORD') }
  });
  const admin = client(baseUrl, session.data.access_token);
  const suffix = randomUUID();
  const createdUsers = [];
  const createdVersionIds = [];
  let fileId = null;
  let rejectedFileId = null;
  let assetId = null;
  let articleId = null;
  let executionError = null;
  const cleanupErrors = [];

  try {
    const roles = await admin.request('/roles?fields=id,name&limit=-1');
    const { editorRoleId, reviewerRoleId, publisherRoleId } = resolvePublicationWorkflowRoles(roles.data);
    const editor = await createTestUser(admin, editorRoleId, suffix, 'editor');
    const reviewer = await createTestUser(admin, reviewerRoleId, suffix, 'reviewer');
    const publisher = await createTestUser(admin, publisherRoleId, suffix, 'publisher');
    createdUsers.push(editor.id, reviewer.id, publisher.id);
    const editorApi = client(baseUrl, editor.token);
    const reviewerApi = client(baseUrl, reviewer.token);
    const publisherApi = client(baseUrl, publisher.token);

    const logoBytes = await readFile(new URL('../../demo/assets/ruijun-logo.png', import.meta.url));
    rejectedFileId = randomUUID();
    const rejectedForm = new FormData();
    rejectedForm.set('id', rejectedFileId);
    rejectedForm.set('file', new Blob([logoBytes], { type: 'image/png' }), 'spoofed.exe');
    const rejectedUpload = await editorApi.upload('/files', rejectedForm);
    assert(rejectedUpload.data?.id === rejectedFileId, 'The candidate file could not be stored for server-side validation');
    const rejectedAsset = await editorApi.request('/items/media_assets', {
      method: 'POST', body: {
        file_id: rejectedFileId, original_file_name: 'spoofed.exe', mime_type: 'image/png', byte_size: logoBytes.byteLength,
        usage_scope: 'product', copyright_status: 'authorized'
      }, expected: [400]
    });
    assert(rejectedAsset.status === 400, 'MIME/extension spoofing was accepted as a reviewable public media asset');

    const factoryBytes = await readFile(new URL('../../website/public/assets/psd/reason-factory-full.jpg', import.meta.url));
    fileId = randomUUID();
    const validForm = new FormData();
    validForm.set('id', fileId);
    validForm.set('title', 'E2E factory image');
    validForm.set('file', new Blob([factoryBytes], { type: 'image/jpeg' }), 'machine.jpg');
    const upload = await editorApi.upload('/files', validForm);
    assert(upload.data?.id === fileId, 'Content editor could not upload a valid media candidate');

    const asset = await editorApi.request('/items/media_assets', {
      method: 'POST', body: {
        file_id: fileId, original_file_name: 'machine.jpg', mime_type: 'image/jpeg', byte_size: factoryBytes.byteLength,
        usage_scope: 'article', media_type: 'image', width: 3840, height: 1880, placement_key: 'default.image', enabled: true,
        copyright_status: 'authorized', alt_text: 'E2E 新闻封面媒体'
      }
    });
    assetId = asset.data.id;
    assert(asset.data.status === 'draft' && asset.data.publication_state === 'unpublished', 'Media asset did not begin as a private draft');

    const articleSlug = `e2e-media-${suffix.slice(0, 8)}`;
    const article = await editorApi.request('/items/articles', {
      method: 'POST', body: {
        slug: articleSlug, category: 'news', title: 'E2E 媒体治理文章', display_date: '2026-08-27',
        summary: '验证受控新闻封面媒体。', body: '这是一条用于验证媒体治理公开读取的临时文章。',
        media: [{ media_asset_id: assetId, alt: 'E2E 新闻封面' }], cover_asset: assetId,
        seo: { title: 'E2E 媒体治理文章', description: '验证受控媒体公开读取。' }, source_document: 'media-governance-e2e'
      }
    });
    articleId = article.data.id;
    assert(Array.isArray(article.data.media) && article.data.media[0]?.media_asset_id === assetId && String(article.data.cover_asset) === String(assetId), 'Directus did not preserve the article media reference format');
    const blocked = await editorApi.request(`/items/articles/${articleId}`, { method: 'PATCH', body: { status: 'review' }, expected: [400] });
    assert(blocked.status === 400, 'Draft media was accepted when content entered review');

    const reviewing = await editorApi.request(`/items/media_assets/${assetId}`, { method: 'PATCH', body: { status: 'review' } });
    assert(reviewing.data.status === 'review', 'Media asset could not enter review');
    const scheduled = await reviewerApi.request(`/items/media_assets/${assetId}`, { method: 'PATCH', body: { status: 'scheduled' } });
    assert(scheduled.data.status === 'scheduled', 'Review manager could not approve article media');
    const published = await publisherApi.request(`/items/media_assets/${assetId}`, { method: 'PATCH', body: { status: 'published' } });
    assert(published.data.status === 'published' && published.data.publication_state === 'published', 'Review manager could not publish approved media');

    const accepted = await editorApi.request(`/items/articles/${articleId}`, { method: 'PATCH', body: { status: 'review' } });
    assert(accepted.data.status === 'review', 'Published media did not allow article review submission');
    const articleScheduled = await reviewerApi.request(`/items/articles/${articleId}`, { method: 'PATCH', body: { status: 'scheduled' } });
    assert(articleScheduled.data.status === 'scheduled', 'Review manager could not approve the article after media publication');
    const articlePublished = await publisherApi.request(`/items/articles/${articleId}`, { method: 'PATCH', body: { status: 'published' } });
    assert(articlePublished.data.status === 'published', 'Review manager could not publish the article after media approval');
    const directArticle = await admin.request(`/items/articles/${articleId}?fields=id,slug,status,publication_state,published_at,cover_asset,media`);
    assert(directArticle.data?.status === 'published' && directArticle.data?.publication_state === 'published', `Directus did not persist the published article state: ${JSON.stringify(directArticle.data)}`);
    const websiteEnv = await websiteSettings();
    const bffProbe = await fetch(`${baseUrl}/items/articles?filter[slug][_eq]=${encodeURIComponent(articleSlug)}&filter[status][_eq]=published&filter[publication_state][_eq]=published&fields=id,slug,status,publication_state,published_at&limit=1`, { headers: { Accept: 'application/json', Authorization: `Bearer ${websiteEnv.CMS_BFF_TOKEN || ''}` } });
    const bffProbeBody = await bffProbe.json().catch(() => ({}));
    assert(Array.isArray(bffProbeBody.data) && bffProbeBody.data.length === 1, `BFF token cannot read the published article directly (HTTP ${bffProbe.status}; body=${JSON.stringify(bffProbeBody)})`);

    if (websiteApiBaseUrl) {
      const response = await fetch(new URL(`/api/public/v1/articles/${encodeURIComponent(articleSlug)}`, websiteApiBaseUrl));
      const payload = await response.json();
      assert(response.ok && payload?.data?.slug === articleSlug, `Nuxt BFF did not expose the published article (HTTP ${response.status}; source=${payload?.source || 'unknown'}; cache=${payload?.cache || 'unknown'}; body=${JSON.stringify(payload)})`);
      assert(payload.data.cover_asset === `${baseUrl.replace(/\/$/, '')}/assets/${fileId}`, 'Nuxt BFF did not resolve the published article cover asset to its public file URL');
      assert(payload.data.media?.[0]?.path === `${baseUrl.replace(/\/$/, '')}/assets/${fileId}`, 'Nuxt BFF did not resolve the published article media asset to its public file URL');
    }
    console.log('Media asset governance E2E passed.');
  } catch (error) {
    executionError = error;
  } finally {
    for (const [collection, itemId] of [['media_assets', assetId], ['articles', articleId]]) {
      if (!itemId) continue;
      try {
        const versions = await admin.request(`/items/content_versions?filter[content_collection][_eq]=${collection}&filter[content_item_id][_eq]=${encodeURIComponent(itemId)}&fields=id&limit=-1`);
        createdVersionIds.push(...versions.data.map((version) => version.id));
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    for (const versionId of [...new Set(createdVersionIds)]) {
      try { await admin.request(`/items/content_versions/${versionId}`, { method: 'DELETE', expected: [204] }); } catch (error) { cleanupErrors.push(error); }
    }
    for (const [collection, itemId] of [['media_assets', assetId], ['articles', articleId]]) {
      if (!itemId) continue;
      try { await admin.request(`/items/${collection}/${itemId}`, { method: 'DELETE', expected: [204] }); } catch (error) { cleanupErrors.push(error); }
    }
    if (fileId) {
      try { await admin.request(`/files/${fileId}`, { method: 'DELETE', expected: [204] }); } catch (error) { cleanupErrors.push(error); }
    }
    if (rejectedFileId) {
      try { await admin.request(`/files/${rejectedFileId}`, { method: 'DELETE', expected: [204] }); } catch (error) { cleanupErrors.push(error); }
    }
    for (const userId of createdUsers) {
      try {
        await admin.request(`/users/${userId}`, { method: 'DELETE', expected: [204] });
      } catch {
        try { await admin.request(`/users/${userId}`, { method: 'PATCH', body: { status: 'archived' } }); } catch (error) { cleanupErrors.push(error); }
      }
    }
  }
  if (executionError) throw executionError;
  if (cleanupErrors.length) throw new Error(`Media asset governance E2E cleanup failed: ${cleanupErrors[0].message}`);
}

await main();
