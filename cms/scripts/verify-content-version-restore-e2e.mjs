import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const cmsRoot = new URL('../', import.meta.url);

function required(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function localSettings() {
  const content = await readFile(new URL('.env.local', cmsRoot), 'utf8');
  return Object.fromEntries(content.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    return match ? [[match[1].trim(), match[2]]] : [];
  }));
}

function client(baseUrl, token) {
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
      // The Directus delete endpoint may intentionally have no JSON body.
    }
    if (!expected.includes(response.status)) {
      const message = payload?.errors?.[0]?.message || `HTTP ${response.status}`;
      throw new Error(`${method} ${path} failed: ${message}`);
    }
    return { status: response.status, data: payload?.data };
  }
  return { request };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createTestUser(admin, roleId, suffix, label) {
  const token = randomUUID();
  const result = await admin.request('/users', {
    method: 'POST',
    body: {
      email: `${suffix.slice(0, 12)}.${label}@example.com`,
      password: `E2E-${randomUUID()}-Aa1!`,
      role: roleId,
      token,
      status: 'active',
      first_name: 'E2E',
      last_name: 'Content Version'
    }
  });
  return { id: result.data.id, token };
}

async function main() {
  const settings = await localSettings();
  const baseUrl = required(settings.CMS_BASE_URL || `http://${settings.HOST}:${settings.PORT}`, 'CMS_BASE_URL');
  const login = client(baseUrl);
  const session = await login.request('/auth/login', {
    method: 'POST',
    body: { email: required(settings.ADMIN_EMAIL, 'ADMIN_EMAIL'), password: required(settings.ADMIN_PASSWORD, 'ADMIN_PASSWORD') }
  });
  const admin = client(baseUrl, session.data.access_token);
  const suffix = randomUUID();
  const createdUsers = [];
  const createdVersionIds = [];
  let productId = null;

  try {
    const roles = await admin.request('/roles?fields=id,name&limit=-1');
    const rolesByName = new Map(roles.data.map((role) => [role.name, role.id]));
    const editor = await createTestUser(admin, required(rolesByName.get('内容编辑'), 'content_editor role'), suffix, 'editor');
    createdUsers.push(editor.id);
    const reviewer = await createTestUser(admin, required(rolesByName.get('技术审核人员'), 'technical_reviewer role'), suffix, 'reviewer');
    createdUsers.push(reviewer.id);
    const publisher = await createTestUser(admin, required(rolesByName.get('发布人员'), 'publisher role'), suffix, 'publisher');
    createdUsers.push(publisher.id);

    const editorApi = client(baseUrl, editor.token);
    const reviewerApi = client(baseUrl, reviewer.token);
    const publisherApi = client(baseUrl, publisher.token);
    const initialName = `Version one ${suffix.slice(0, 8)}`;
    const changedName = `Version two ${suffix.slice(0, 8)}`;
    const created = await editorApi.request('/items/product_models', {
      method: 'POST',
      body: {
        series_code: 'E2E', model_code: `E2E-${suffix.slice(0, 8)}`,
        name: initialName,
        // The hook must discard forged publishing fields at creation time.
        status: 'published', publication_state: 'published'
      }
    });
    productId = created.data.id;
    assert(created.data.status === 'draft' && created.data.publication_state === 'unpublished', 'Editor creation was not forced to an unpublished draft');

    const reviewing = await editorApi.request(`/items/product_models/${productId}`, {
      method: 'PATCH', body: { name: changedName, status: 'review' }
    });
    assert(reviewing.data.status === 'review', 'Editor could not submit the draft for review');
    const scheduled = await reviewerApi.request(`/items/product_models/${productId}`, {
      method: 'PATCH', body: { status: 'scheduled' }
    });
    assert(scheduled.data.status === 'scheduled', 'Technical reviewer could not schedule reviewed content');
    const published = await publisherApi.request(`/items/product_models/${productId}`, {
      method: 'PATCH', body: { status: 'published' }
    });
    assert(published.data.status === 'published' && published.data.publication_state === 'published', 'Publisher could not publish scheduled content');

    const versions = await admin.request(`/items/content_versions?filter[content_collection][_eq]=product_models&filter[content_item_id][_eq]=${encodeURIComponent(productId)}&sort=created_at&limit=-1`);
    for (const version of versions.data) createdVersionIds.push(version.id);
    const draftVersion = versions.data.find((version) => version.action === 'submitted_for_review');
    assert(draftVersion, 'The draft-to-review update did not create a version snapshot');
    assert(draftVersion.snapshot?.name === initialName, 'The version snapshot did not retain the prior content');

    const history = await publisherApi.request(`/content-version-restore?collection=product_models&itemId=${encodeURIComponent(productId)}&limit=50`);
    assert(history.data.some((version) => version.id === draftVersion.id && version.changed_fields.includes('name')), 'Publisher history endpoint did not return the expected version summary');
    const versionDetail = await publisherApi.request(`/content-version-restore/${draftVersion.id}`);
    assert(versionDetail.data.version.snapshot.name === initialName && versionDetail.data.current.name === changedName, 'Publisher version detail endpoint did not expose the historical-to-current comparison');

    const unauthorized = await reviewerApi.request(`/content-version-restore/${draftVersion.id}/restore`, {
      method: 'POST', body: { restoreNote: 'Role verification' }, expected: [403]
    });
    assert(unauthorized.status === 403, 'A reviewer was permitted to restore a content version');

    const missingNote = await publisherApi.request(`/content-version-restore/${draftVersion.id}/restore`, {
      method: 'POST', body: {}, expected: [400]
    });
    assert(missingNote.status === 400, 'A restore without an audit note was accepted');

    const restored = await publisherApi.request(`/content-version-restore/${draftVersion.id}/restore`, {
      method: 'POST', body: { restoreNote: 'E2E restore verification' }
    });
    assert(restored.data.status === 'draft', 'Restore endpoint did not report a draft result');
    const item = await admin.request(`/items/product_models/${productId}`);
    assert(item.data.name === initialName, 'Restore endpoint did not restore the snapshot content');
    assert(item.data.status === 'draft' && item.data.publication_state === 'unpublished', 'Restore endpoint did not force an unpublished draft');
    assert(item.data.publication_log?.at(-1)?.action === 'restored_from_version', 'Restore endpoint did not append an audit entry');
    const restoredVersion = await admin.request(`/items/content_versions/${draftVersion.id}`);
    assert(restoredVersion.data.status === 'restored', 'Restored snapshot was not marked as restored');

    console.log('Content version restore E2E passed.');
  } finally {
    if (productId) {
      const generatedVersions = await admin.request(`/items/content_versions?filter[content_collection][_eq]=product_models&filter[content_item_id][_eq]=${encodeURIComponent(productId)}&fields=id&limit=-1`);
      for (const version of generatedVersions.data) createdVersionIds.push(version.id);
    }
    for (const versionId of [...new Set(createdVersionIds)]) await admin.request(`/items/content_versions/${versionId}`, { method: 'DELETE', expected: [204] });
    if (productId) await admin.request(`/items/product_models/${productId}`, { method: 'DELETE', expected: [204] });
    for (const userId of createdUsers) await admin.request(`/users/${userId}`, { method: 'DELETE', expected: [204] });
  }
}

await main();
