import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const cmsRoot = new URL('../', import.meta.url);

function required(value, name) {
  if (!value || value === '<REPLACE_ME>') throw new Error(`${name} is required`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isLocalOrPrivateHttp(value, label) {
  const url = new URL(required(value, label));
  const host = url.hostname;
  const private172 = /^172\.(\d{1,3})\./.exec(host);
  const allowed = host === 'localhost' || host === '127.0.0.1' || host === '::1'
    || /^10\./.test(host) || /^192\.168\./.test(host)
    || Boolean(private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31);
  if (url.protocol !== 'http:' || !allowed) throw new Error(`${label} must be a local or RFC1918 HTTP URL`);
  return url.toString().replace(/\/$/, '');
}

function parseEnvironment(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    return match ? [[match[1].trim(), match[2]]] : [];
  }));
}

function client(baseUrl, token = '') {
  return {
    async request(path, { method = 'GET', body, expected = [200] } = {}) {
      const response = await fetch(new URL(path.replace(/^\//, ''), `${baseUrl}/`), {
        method,
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      let payload = null;
      try { payload = await response.json(); } catch { /* Directus DELETE responses are empty. */ }
      if (!expected.includes(response.status)) {
        throw new Error(`${method} ${path} failed: ${payload?.errors?.[0]?.message || `HTTP ${response.status}`}`);
      }
      return { status: response.status, data: payload?.data };
    }
  };
}

async function uploadTemporaryPng(baseUrl, accessToken) {
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'image/png' }), 'publication-rehearsal.png');
  const response = await fetch(new URL('files', `${baseUrl}/`), {
    method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` }, body: form
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`POST /files failed: ${payload?.errors?.[0]?.message || `HTTP ${response.status}`}`);
  return payload.data;
}

function pickRole(roles, candidates, label) {
  const role = roles.find((item) => candidates.includes(item.name));
  if (!role?.id) throw new Error(`${label} role is not configured`);
  return role.id;
}

async function createTemporaryUser(admin, roleId, suffix, label) {
  const token = randomUUID();
  const password = `E2E-${randomUUID()}-Aa1!`;
  const email = `${suffix.slice(0, 12)}.${label}@example.com`;
  const result = await admin.request('/users', {
    method: 'POST',
    body: { email, password, role: roleId, token, status: 'active', first_name: 'CMS', last_name: 'Publication E2E' }
  });
  return { id: result.data.id, token };
}

async function main() {
  const settings = parseEnvironment(await readFile(new URL('.env.local', cmsRoot), 'utf8'));
  const baseUrl = isLocalOrPrivateHttp(settings.CMS_BASE_URL || settings.PUBLIC_URL, 'CMS_BASE_URL');
  const login = client(baseUrl);
  const session = await login.request('/auth/login', {
    method: 'POST',
    body: { email: required(settings.ADMIN_EMAIL, 'ADMIN_EMAIL'), password: required(settings.ADMIN_PASSWORD, 'ADMIN_PASSWORD') }
  });
  const admin = client(baseUrl, session.data.access_token);
  const suffix = randomUUID();
  const createdUsers = [];
  let articleId = null;
  let mediaAssetId = null;
  let fileId = null;
  let verification = null;
  const slug = `e2e-publication-${suffix}`;

  try {
    const roles = await admin.request('/roles?fields=id,name&limit=-1');
    const editorRole = pickRole(roles.data, ['内容编辑', '鍐呭缂栬緫'], 'content editor');
    const brandReviewerRole = pickRole(roles.data, ['品牌审核人员', '鍝佺墝瀹℃牳浜哄憳'], 'brand reviewer');
    const publisherRole = pickRole(roles.data, ['发布人员', '鍙戝竷浜哄憳'], 'publisher');
    const editor = await createTemporaryUser(admin, editorRole, suffix, 'editor');
    const reviewer = await createTemporaryUser(admin, brandReviewerRole, suffix, 'reviewer');
    const publisher = await createTemporaryUser(admin, publisherRole, suffix, 'publisher');
    createdUsers.push(editor.id, reviewer.id, publisher.id);

    const editorApi = client(baseUrl, editor.token);
    const reviewerApi = client(baseUrl, reviewer.token);
    const publisherApi = client(baseUrl, publisher.token);
    const file = await uploadTemporaryPng(baseUrl, session.data.access_token);
    fileId = String(file.id);
    const mediaDraft = await editorApi.request('/items/media_assets', {
      method: 'POST',
      body: {
        file_id: fileId, original_file_name: file.filename_download, mime_type: file.type,
        byte_size: Number(file.filesize), usage_scope: 'article', alt_text: 'Temporary publication rehearsal',
        copyright_status: 'owned', authorization_note: 'Temporary local E2E fixture.',
        source_document: `E2E media rehearsal ${suffix}`, status: 'published', publication_state: 'published'
      }
    });
    mediaAssetId = mediaDraft.data.id;
    assert(mediaDraft.data.status === 'draft' && mediaDraft.data.publication_state === 'unpublished', 'Media asset creation did not start as a draft');
    const mediaReview = await editorApi.request(`/items/media_assets/${mediaAssetId}`, { method: 'PATCH', body: { status: 'review' } });
    assert(mediaReview.data.status === 'review', 'Editor could not submit the media asset for review');
    const mediaApproved = await reviewerApi.request(`/items/media_assets/${mediaAssetId}`, { method: 'PATCH', body: { status: 'scheduled', review_note: 'Temporary media review passed.' } });
    assert(mediaApproved.data.status === 'scheduled', 'Brand reviewer could not approve the media asset');
    const mediaPublished = await publisherApi.request(`/items/media_assets/${mediaAssetId}`, { method: 'PATCH', body: { status: 'published' } });
    assert(mediaPublished.data.status === 'published' && mediaPublished.data.publication_state === 'published', 'Publisher could not publish the media asset');

    const created = await editorApi.request('/items/articles', {
      method: 'POST',
      body: {
        slug, category: 'e2e-demo', title: 'CMS publication rehearsal', summary: 'Temporary publication workflow record.',
        body: 'This record exists only for the local CMS publication rehearsal and is removed automatically.',
        cover_asset: String(mediaAssetId), seo: { title: 'CMS publication rehearsal' },
        source_document: `E2E publication rehearsal ${suffix}`, status: 'published', publication_state: 'published'
      }
    });
    articleId = created.data.id;
    assert(created.data.status === 'draft' && created.data.publication_state === 'unpublished', 'Article creation did not start as a draft');

    const submitted = await editorApi.request(`/items/articles/${articleId}`, {
      method: 'PATCH', body: { title: 'CMS publication rehearsal (review)', status: 'review' }
    });
    assert(submitted.data.status === 'review' && submitted.data.publication_state === 'unpublished', 'Editor could not submit the draft for review');

    const approved = await reviewerApi.request(`/items/articles/${articleId}`, {
      method: 'PATCH', body: { status: 'scheduled', review_note: 'Temporary brand review passed.' }
    });
    assert(approved.data.status === 'scheduled' && approved.data.reviewed_by === reviewer.id, 'Brand reviewer approval was not recorded');

    const published = await publisherApi.request(`/items/articles/${articleId}`, {
      method: 'PATCH', body: { status: 'published' }
    });
    assert(published.data.status === 'published' && published.data.publication_state === 'published' && published.data.published_by === publisher.id, 'Publisher could not publish the scheduled article');

    const unpublished = await publisherApi.request(`/items/articles/${articleId}`, {
      method: 'PATCH', body: { status: 'unpublished', review_note: 'Temporary rehearsal content withdrawn.' }
    });
    assert(unpublished.data.status === 'unpublished' && unpublished.data.publication_state === 'unpublished', 'Publisher could not unpublish the article');

    const archived = await publisherApi.request(`/items/articles/${articleId}`, {
      method: 'PATCH', body: { status: 'archived', review_note: 'Temporary rehearsal completed.' }
    });
    assert(archived.data.status === 'archived' && archived.data.publication_state === 'unpublished', 'Publisher could not archive the article');
    assert(Array.isArray(archived.data.publication_log) && archived.data.publication_log.some((entry) => entry.action === 'published') && archived.data.publication_log.some((entry) => entry.action === 'unpublished'), 'Publication audit log is incomplete');

    verification = { workflow: 'draft-review-scheduled-published-unpublished-archived', temporaryDataCreated: true };
  } finally {
    if (articleId != null) {
      try { await admin.request(`/items/articles/${articleId}`, { method: 'DELETE', expected: [204] }); } catch { /* Cleanup is verified below. */ }
    }
    if (mediaAssetId != null) {
      try { await admin.request(`/items/media_assets/${mediaAssetId}`, { method: 'DELETE', expected: [204] }); } catch { /* Cleanup is verified below. */ }
    }
    if (fileId != null) {
      try { await admin.request(`/files/${fileId}`, { method: 'DELETE', expected: [204] }); } catch { /* Cleanup is verified below. */ }
    }
    for (const userId of createdUsers) {
      try { await admin.request(`/users/${userId}`, { method: 'DELETE', expected: [204] }); }
      catch { try { await admin.request(`/users/${userId}`, { method: 'PATCH', body: { status: 'archived' } }); } catch { /* Best effort. */ } }
    }
    const residual = await admin.request(`/items/articles?filter[slug][_eq]=${encodeURIComponent(slug)}&limit=1&fields=id,status`);
    if (Array.isArray(residual.data) && residual.data.length) throw new Error('Temporary publication article was not fully cleaned');
    if (mediaAssetId != null) {
      const residualMedia = await admin.request(`/items/media_assets?filter[id][_eq]=${encodeURIComponent(mediaAssetId)}&limit=1&fields=id,status`);
      if (Array.isArray(residualMedia.data) && residualMedia.data.length) throw new Error('Temporary media asset was not fully cleaned');
    }
    if (fileId != null) {
      const residualFile = await admin.request(`/files?filter[id][_eq]=${encodeURIComponent(fileId)}&limit=1&fields=id`);
      if (Array.isArray(residualFile.data) && residualFile.data.length) throw new Error('Temporary media file was not fully cleaned');
    }
  }
  console.log(JSON.stringify({ ...verification, temporaryDataCleaned: true }));
}

await main();
