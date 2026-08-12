import assert from 'node:assert/strict';
import test from 'node:test';

const { createDirectusSchemaApplier, permissionSpecs } = await import('../scripts/apply-directus-schema.mjs');

test('Directus role permissions keep lifecycle transitions separate from content mutation', () => {
  const reviewer = permissionSpecs('review_manager', 'review-policy');
  const manager = permissionSpecs('notification_manager', 'notification-policy');
  const readOnly = permissionSpecs('read_only_manager', 'readonly-policy');
  const contentWorkflowFields = new Set([
    'status', 'review_note', 'publication_state', 'published_at', 'reviewed_by', 'reviewed_at',
    'published_by', 'publication_log'
  ]);

  assert.ok(reviewer.every((permission) => permission.action === 'read' || permission.fields.every((field) => contentWorkflowFields.has(field))));
  assert.ok(reviewer.filter((permission) => permission.action === 'update').every((permission) => permission.fields.includes('status') && permission.fields.includes('review_note')));
  assert.deepEqual(manager.find((permission) => permission.action === 'update').fields, [
    'status', 'manual_note', 'handled_by', 'handled_at', 'lock_token', 'locked_by', 'locked_at',
    'next_attempt_at', 'last_error', 'sent_at', 'activity_log'
  ]);
  assert.ok(!manager.find((permission) => permission.action === 'read').fields.includes('lock_token'));
  assert.ok(!readOnly.some((permission) => permission.collection === 'leads'));
  assert.deepEqual(readOnly.find((permission) => permission.collection === 'service_entry_clicks').fields, ['entry_type', 'source_page']);
  assert.ok(readOnly.some((permission) => permission.collection === 'content_versions' && permission.action === 'read'));
});
const { buildDirectusSchemaPlan } = await import('../schema/directus-schema-plan.mjs');

test('Directus content editor permissions use contract fields and only update editable lifecycle states', () => {
  const plan = buildDirectusSchemaPlan();
  const expectedFields = Map.groupBy(plan.fields, (field) => field.collection);
  const managedCollections = plan.roles.find((role) => role.key === 'content_editor').manage_collections;
  const permissions = permissionSpecs('content_editor', 'editor-policy');

  for (const collection of managedCollections) {
    const collectionPermissions = permissions.filter((permission) => permission.collection === collection);
    assert.deepEqual(collectionPermissions.map((permission) => permission.action), ['read', 'create', 'update']);
    const contractFields = expectedFields.get(collection).map((field) => field.field);
    const read = collectionPermissions.find((permission) => permission.action === 'read');
    const create = collectionPermissions.find((permission) => permission.action === 'create');
    const update = collectionPermissions.find((permission) => permission.action === 'update');
    assert.deepEqual(read.fields, ['id', ...contractFields]);
    assert.deepEqual(create.fields, contractFields);
    assert.deepEqual(update.fields, contractFields);
    assert.deepEqual(update.permissions, { status: { _in: ['draft', 'rejected', 'unpublished'] } });
    assert.ok(collectionPermissions.every((permission) => !permission.fields.includes('*')));
  }
});

test('Directus schema applier creates only missing collections, fields, roles, and permissions', async () => {
  const calls = [];
  let policySequence = 0;
  const applier = createDirectusSchemaApplier({
    baseUrl: 'https://cms.example.test',
    accessToken: 'server-only-token',
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET', body: options.body, headers: options.headers };
      calls.push(request);
      if (request.url.pathname === '/collections') return Response.json({ data: [{ collection: 'pages' }] });
      if (request.url.pathname.startsWith('/fields/')) return Response.json({ data: request.url.pathname.endsWith('/pages') ? [{ field: 'slug' }] : [] });
      if (request.url.pathname === '/roles' && request.method === 'GET') return Response.json({ data: [{ id: 'sales-role', name: '销售人员' }] });
      if (request.url.pathname === '/policies' && request.method === 'GET') return Response.json({ data: [] });
      if (request.url.pathname === '/policies' && request.method === 'POST') return Response.json({ data: { id: `policy-${++policySequence}` } });
      if (request.url.pathname.startsWith('/roles/') && request.method === 'PATCH') return Response.json({ data: {} });
      if (request.url.pathname === '/permissions') return Response.json({ data: [] });
      if (request.url.pathname === '/roles' && request.method === 'POST') return Response.json({ data: { id: 'new-role' } });
      return Response.json({ data: {} });
    }
  });

  const result = await applier.apply();

  assert.equal(result.collections.created, buildDirectusSchemaPlan().collections.length - 1);
  assert.equal(result.collections.skipped, 1);
  assert.equal(result.fields.skipped, 1);
  assert.equal(result.roles.created, 7);
  assert.equal(result.roles.skipped, 2);
  assert.ok(result.permissions.created > 0);
  assert.ok(calls.some((call) => call.method === 'POST' && call.url.pathname === '/collections'));
  assert.ok(calls.some((call) => call.method === 'POST' && call.url.pathname === '/fields/pages'));
  assert.ok(calls.some((call) => call.method === 'POST' && call.url.pathname === '/permissions'));
  assert.ok(calls.every((call) => call.headers?.Authorization === 'Bearer server-only-token'));
});

test('Directus schema applier updates native collection translations without changing API keys', async () => {
  const calls = [];
  const applier = createDirectusSchemaApplier({
    baseUrl: 'https://cms.example.test',
    accessToken: 'server-only-token',
    schemaPlan: {
      collections: [{
        collection: 'pages',
        meta: { translations: [{ language: 'zh-CN', translation: '页面' }] },
        schema: {}
      }],
      fields: [],
      roles: []
    },
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET', body: options.body };
      calls.push(request);
      if (request.url.pathname === '/collections' && request.method === 'GET') {
        return Response.json({ data: [{ collection: 'pages', meta: { translations: null } }] });
      }
      if (request.url.pathname === '/collections/pages' && request.method === 'PATCH') return Response.json({ data: {} });
      if (request.url.pathname === '/roles' || request.url.pathname === '/policies' || request.url.pathname === '/permissions') return Response.json({ data: [] });
      if (request.url.pathname === '/access') return Response.json({ data: [] });
      throw new Error(`Unexpected request ${request.method} ${request.url.pathname}`);
    }
  });

  const result = await applier.apply();
  const update = calls.find((call) => call.method === 'PATCH' && call.url.pathname === '/collections/pages');
  assert.equal(result.collections.updated, 1);
  assert.deepEqual(JSON.parse(update.body), { meta: { translations: [{ language: 'zh-CN', translation: '页面' }] } });
});

test('Directus schema applier migrates legacy English roles to the Chinese role without duplicates', async () => {
  const calls = [];
  const applier = createDirectusSchemaApplier({
    baseUrl: 'https://cms.example.test', accessToken: 'server-only-token',
    schemaPlan: { collections: [], fields: [], roles: [{ key: 'notification_manager', name: '通知管理员', admin: false }] },
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET', body: options.body };
      calls.push(request);
      if (request.url.pathname === '/collections') return Response.json({ data: [] });
      if (request.url.pathname === '/roles' && request.method === 'GET') return Response.json({ data: [{ id: 'legacy-role', name: 'Notification manager' }, { id: 'current-role', name: '通知管理员' }] });
      if (request.url.pathname === '/users' && request.method === 'GET') return Response.json({ data: [{ id: 'manager-user', role: 'legacy-role' }] });
      if (request.url.pathname === '/users/manager-user' && request.method === 'PATCH') return Response.json({ data: { id: 'manager-user' } });
      if (request.url.pathname === '/roles/legacy-role' && request.method === 'DELETE') return Response.json({ data: null });
      if (request.url.pathname === '/policies' && request.method === 'GET') return Response.json({ data: [{ id: 'manager-policy', name: 'Ruijun notification_manager' }] });
      if (request.url.pathname === '/access' && request.method === 'GET') return Response.json({ data: [{ role: 'current-role', policy: 'manager-policy' }] });
      if (request.url.pathname === '/permissions' && request.method === 'GET') return Response.json({ data: [] });
      if (request.url.pathname === '/permissions' && request.method === 'POST') return Response.json({ data: {} });
      throw new Error(`Unexpected request ${request.method} ${request.url.pathname}`);
    }
  });

  const result = await applier.apply();
  assert.equal(result.roles.created, 0);
  assert.equal(result.roles.migrated, 1);
  assert.deepEqual(JSON.parse(calls.find((call) => call.url.pathname === '/users/manager-user').body), { role: 'current-role' });
  assert.ok(calls.some((call) => call.method === 'DELETE' && call.url.pathname === '/roles/legacy-role'));
});

test('Directus schema applier fails closed on a rejected schema write', async () => {
  const applier = createDirectusSchemaApplier({
    baseUrl: 'https://cms.example.test', accessToken: 'server-only-token',
    fetchImpl: async (url, options = {}) => {
      const request = new URL(url);
      if (request.pathname === '/collections' && (options.method || 'GET') === 'GET') return Response.json({ data: [] });
      if (request.pathname === '/collections') return Response.json({ errors: [{ message: 'denied' }] }, { status: 403 });
      return Response.json({ data: [] });
    }
  });

  await assert.rejects(applier.apply(), /Unable to create collection pages: 403/);
});

test('Directus schema applier surfaces a rejected Directus error message', async () => {
  const applier = createDirectusSchemaApplier({
    baseUrl: 'https://cms.example.test', accessToken: 'server-only-token',
    schemaPlan: { collections: [{ collection: 'pages' }], fields: [], roles: [] },
    fetchImpl: async (url, options = {}) => {
      const request = new URL(url);
      if (request.pathname === '/collections' && (options.method || 'GET') === 'GET') return Response.json({ data: [] });
      if (request.pathname === '/collections') {
        return Response.json({ errors: [{ message: 'Collection validation failed' }] }, { status: 400 });
      }
      if (request.pathname === '/roles' || request.pathname === '/policies' || request.pathname === '/permissions') return Response.json({ data: [] });
      throw new Error(`Unexpected request ${options.method || 'GET'} ${request.pathname}`);
    }
  });

  await assert.rejects(applier.apply(), /Collection validation failed/);
});

test('Directus schema applier assigns each business role a policy and writes permissions against that policy', async () => {
  const policyRequests = [];
  const accessRequests = [];
  const permissionRequests = [];
  const applier = createDirectusSchemaApplier({
    baseUrl: 'https://cms.example.test', accessToken: 'server-only-token',
    schemaPlan: { collections: [], fields: [], roles: [{ key: 'content_editor', name: 'Content editor', admin: false }] },
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET', body: options.body };
      if (request.url.pathname === '/collections') return Response.json({ data: [] });
      if (request.url.pathname === '/roles' && request.method === 'GET') return Response.json({ data: [{ id: 'role-1', name: 'Content editor', policies: [] }] });
      if (request.url.pathname === '/policies' && request.method === 'GET') return Response.json({ data: [] });
      if (request.url.pathname === '/access' && request.method === 'GET') return Response.json({ data: [] });
      if (request.url.pathname === '/policies' && request.method === 'POST') {
        policyRequests.push(JSON.parse(request.body));
        return Response.json({ data: { id: 'policy-1', name: 'Ruijun content_editor' } });
      }
      if (request.url.pathname === '/access' && request.method === 'POST') {
        accessRequests.push(JSON.parse(request.body));
        return Response.json({ data: {} });
      }
      if (request.url.pathname === '/permissions' && request.method === 'GET') return Response.json({ data: [] });
      if (request.url.pathname === '/permissions' && request.method === 'POST') {
        permissionRequests.push(JSON.parse(request.body));
        return Response.json({ data: {} });
      }
      throw new Error(`Unexpected request ${request.method} ${request.url.pathname}`);
    }
  });

  await applier.apply();

  assert.deepEqual(policyRequests, [{ name: 'Ruijun content_editor', admin_access: false, app_access: true }]);
  assert.deepEqual(accessRequests, [{ role: 'role-1', policy: 'policy-1' }]);
  assert.ok(permissionRequests.length > 0);
  assert.ok(permissionRequests.every((permission) => permission.policy === 'policy-1' && !Object.hasOwn(permission, 'role')));
});

test('Directus schema applier maps system administration to Directus built-in administration without creating a parallel role or policy', async () => {
  const writes = [];
  const applier = createDirectusSchemaApplier({
    baseUrl: 'https://cms.example.test', accessToken: 'server-only-token',
    schemaPlan: { collections: [], fields: [], roles: [{ key: 'system_admin', name: 'System admin', admin: true }] },
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET' };
      if (request.method !== 'GET') writes.push(request);
      if (request.url.pathname === '/collections' || request.url.pathname === '/roles' || request.url.pathname === '/policies' || request.url.pathname === '/access' || request.url.pathname === '/permissions') {
        return Response.json({ data: [] });
      }
      throw new Error(`Unexpected request ${request.method} ${request.url.pathname}`);
    }
  });

  const result = await applier.apply();

  assert.equal(result.roles.created, 0);
  assert.equal(result.policies.created, 0);
  assert.equal(result.permissions.created, 0);
  assert.deepEqual(writes, []);
});

test('Directus schema applier updates status field metadata when a managed field already exists', async () => {
  let patch;
  const applier = createDirectusSchemaApplier({
    baseUrl: 'https://cms.example.test', accessToken: 'server-only-token',
    schemaPlan: {
      collections: [{ collection: 'leads' }],
      fields: [{ collection: 'leads', field: 'status', meta: { interface: 'select-dropdown', options: { choices: [{ value: 'new', text: '新建' }] } } }],
      roles: []
    },
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET', body: options.body };
      if (request.url.pathname === '/collections') return Response.json({ data: [{ collection: 'leads' }] });
      if (request.url.pathname === '/fields/leads' && request.method === 'GET') return Response.json({ data: [{ field: 'status' }] });
      if (request.url.pathname === '/fields/leads/status' && request.method === 'PATCH') {
        patch = JSON.parse(request.body);
        return Response.json({ data: {} });
      }
      if (request.url.pathname === '/roles' || request.url.pathname === '/policies' || request.url.pathname === '/access' || request.url.pathname === '/permissions') return Response.json({ data: [] });
      throw new Error(`Unexpected request ${request.method} ${request.url.pathname}`);
    }
  });

  const result = await applier.apply();

  assert.equal(result.fields.updated, 1);
  assert.deepEqual(patch, { meta: { interface: 'select-dropdown', options: { choices: [{ value: 'new', text: '新建' }] } } });
});

test('Directus schema applier repairs JSON field metadata so Directus returns structured values', async () => {
  let patch;
  const applier = createDirectusSchemaApplier({
    baseUrl: 'https://cms.example.test', accessToken: 'server-only-token',
    schemaPlan: {
      collections: [{ collection: 'leads' }],
      fields: [{ collection: 'leads', field: 'activity_log', type: 'json', meta: { interface: 'input-code', special: ['cast-json'] } }],
      roles: []
    },
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET', body: options.body };
      if (request.url.pathname === '/collections') return Response.json({ data: [{ collection: 'leads' }] });
      if (request.url.pathname === '/fields/leads' && request.method === 'GET') return Response.json({ data: [{ field: 'activity_log', meta: { interface: 'input-code', special: null } }] });
      if (request.url.pathname === '/fields/leads/activity_log' && request.method === 'PATCH') {
        patch = JSON.parse(request.body);
        return Response.json({ data: {} });
      }
      if (request.url.pathname === '/roles' || request.url.pathname === '/policies' || request.url.pathname === '/access' || request.url.pathname === '/permissions') return Response.json({ data: [] });
      throw new Error(`Unexpected request ${request.method} ${request.url.pathname}`);
    }
  });

  const result = await applier.apply();

  assert.equal(result.fields.updated, 1);
  assert.deepEqual(patch, { meta: { interface: 'input-code', special: ['cast-json'] } });
});

test('Directus schema applier recognizes Directus 11 policy permissions and does not recreate them', async () => {
  const writes = [];
  const applier = createDirectusSchemaApplier({
    baseUrl: 'https://cms.example.test', accessToken: 'server-only-token',
    schemaPlan: { collections: [], fields: [], roles: [{ key: 'sales_user', name: 'Sales', admin: false }] },
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET', body: options.body };
      if (request.url.pathname === '/collections') return Response.json({ data: [] });
      if (request.url.pathname === '/roles') return Response.json({ data: [{ id: 'role-1', name: 'Sales' }] });
      if (request.url.pathname === '/policies') return Response.json({ data: [{ id: 'policy-1', name: 'Ruijun sales_user' }] });
      if (request.url.pathname === '/access') return Response.json({ data: [{ role: 'role-1', policy: 'policy-1' }] });
      if (request.url.pathname === '/permissions') return Response.json({ data: [
        { policy: 'policy-1', collection: 'leads', action: 'read', permissions: { _or: [{ owner: { _null: true } }, { owner: { _eq: '$CURRENT_USER' } }] }, validation: {}, presets: {}, fields: ['id', 'lead_reference', 'lead_type', 'source_page', 'source_campaign', 'name', 'phone', 'company', 'email', 'requirement', 'product_series', 'product_model', 'attachment_ids', 'owner', 'activity_log', 'follow_up_note', 'consent_at', 'status', 'publication_state', 'date_created', 'date_updated'] },
        { policy: 'policy-1', collection: 'leads', action: 'update', permissions: { _or: [{ owner: { _null: true } }, { owner: { _eq: '$CURRENT_USER' } }] }, validation: { owner: { _eq: '$CURRENT_USER' } }, presets: { owner: '$CURRENT_USER' }, fields: ['owner', 'status', 'follow_up_note', 'activity_log'] }
      ] });
      writes.push(request);
      return Response.json({ data: {} });
    }
  });

  const result = await applier.apply();
  assert.deepEqual(result.permissions, { created: 0, updated: 0, skipped: 2 });
  assert.equal(writes.filter((request) => request.url.pathname === '/permissions' && request.method === 'POST').length, 0);
});

test('Directus schema applier removes duplicate and obsolete permissions only from managed policies', async () => {
  const deletes = [];
  const applier = createDirectusSchemaApplier({
    baseUrl: 'https://cms.example.test', accessToken: 'server-only-token',
    schemaPlan: { collections: [], fields: [], roles: [{ key: 'sales_user', name: 'Sales', admin: false }] },
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET' };
      if (request.url.pathname === '/collections') return Response.json({ data: [] });
      if (request.url.pathname === '/roles') return Response.json({ data: [{ id: 'role-1', name: 'Sales' }] });
      if (request.url.pathname === '/policies') return Response.json({ data: [{ id: 'policy-1', name: 'Ruijun sales_user' }] });
      if (request.url.pathname === '/access') return Response.json({ data: [{ role: 'role-1', policy: 'policy-1' }] });
      if (request.url.pathname === '/permissions') return Response.json({ data: [
        { id: 'keep-read', policy: 'policy-1', collection: 'leads', action: 'read' },
        { id: 'remove-read', policy: 'policy-1', collection: 'leads', action: 'read' },
        { id: 'keep-update', policy: 'policy-1', collection: 'leads', action: 'update' },
        { id: 'remove-create', policy: 'policy-1', collection: 'leads', action: 'create' },
        { id: 'unmanaged', policy: 'other-policy', collection: 'leads', action: 'read' }
      ] });
      if (request.method === 'DELETE') deletes.push(request.url.pathname);
      return Response.json({ data: {} });
    }
  });

  const result = await applier.apply();
  assert.equal(result.permissions.deduplicated, 1);
  assert.equal(result.permissions.removed, 1);
  assert.deepEqual(deletes.sort(), ['/permissions/remove-create', '/permissions/remove-read']);
});

test('Directus schema applier grants the website BFF only published-content reads and lead creation', async () => {
  const permissionRequests = [];
  const applier = createDirectusSchemaApplier({
    baseUrl: 'https://cms.example.test', accessToken: 'server-only-token',
    schemaPlan: { collections: [], fields: [], roles: [{ key: 'website_bff', name: 'Website BFF', admin: false }] },
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET', body: options.body };
      if (request.url.pathname === '/collections') return Response.json({ data: [] });
      if (request.url.pathname === '/roles') return Response.json({ data: [{ id: 'role-1', name: 'Website BFF' }] });
      if (request.url.pathname === '/policies') return Response.json({ data: [{ id: 'policy-1', name: 'Ruijun website_bff' }] });
      if (request.url.pathname === '/access') return Response.json({ data: [{ role: 'role-1', policy: 'policy-1' }] });
      if (request.url.pathname === '/permissions' && request.method === 'GET') return Response.json({ data: [] });
      if (request.url.pathname === '/permissions' && request.method === 'POST') {
        permissionRequests.push(JSON.parse(request.body));
        return Response.json({ data: {} });
      }
      throw new Error(`Unexpected request ${request.method} ${request.url.pathname}`);
    }
  });

  await applier.apply();

  const leadPermissions = permissionRequests.filter((permission) => permission.collection === 'leads');
  assert.deepEqual(leadPermissions.map((permission) => permission.action), ['create']);
  assert.deepEqual(permissionRequests.filter((permission) => permission.collection === 'lead_dedupe_keys').map((permission) => permission.action).sort(), ['create', 'read']);
  assert.ok(permissionRequests.some((permission) => permission.collection === 'lead_notification_jobs' && permission.action === 'create'));
  const clickPermission = permissionRequests.find((permission) => permission.collection === 'service_entry_clicks');
  assert.deepEqual({ action: clickPermission.action, fields: clickPermission.fields }, { action: 'create', fields: ['entry_type', 'source_page'] });
  const publicReads = permissionRequests.filter((permission) => permission.action === 'read' && !['lead_dedupe_keys', 'lead_upload_sessions'].includes(permission.collection));
  assert.deepEqual(publicReads.map((permission) => permission.collection).sort(), ['articles', 'external_service_entries', 'manufacturing_evidence', 'media_assets', 'milestones', 'pages', 'product_models', 'product_parameters', 'product_release_snapshots', 'product_series', 'qualifications', 'repair_page_configs', 'service_locations', 'service_resources', 'site_settings']);
  assert.ok(publicReads.every((permission) => permission.permissions.status._eq === 'published' && permission.permissions.publication_state._eq === 'published'));
  assert.ok(publicReads.some((permission) => permission.collection === 'service_resources' && permission.fields.includes('asset')));
  assert.ok(publicReads.some((permission) => permission.collection === 'service_locations' && permission.fields.includes('business_status')));
  assert.ok(publicReads.some((permission) => permission.collection === 'qualifications' && permission.fields.includes('authorization_status')));
  const uploadSessionRead = permissionRequests.find((permission) => permission.collection === 'lead_upload_sessions' && permission.action === 'read');
  assert.deepEqual(uploadSessionRead.fields, ['id', 'upload_reference', 'file_name', 'mime_type', 'byte_size', 'file_id', 'expires_at', 'lead_reference', 'status', 'publication_state']);
  assert.ok(permissionRequests.filter((permission) => permission.collection !== 'lead_upload_sessions').every((permission) => permission.action !== 'update' && permission.action !== 'delete'));
  const uploadSessionUpdate = permissionRequests.find((permission) => permission.collection === 'lead_upload_sessions' && permission.action === 'update');
  assert.deepEqual(uploadSessionUpdate.fields, ['file_id', 'lead_reference', 'status']);
  assert.ok(permissionRequests.some((permission) => permission.collection === 'directus_files' && permission.action === 'create'));
  assert.ok(!permissionRequests.some((permission) => permission.collection === 'media_assets' && permission.action !== 'read'));
});

test('Directus schema applier grants read-only managers click-record visibility without write access', async () => {
  const permissionRequests = [];
  const applier = createDirectusSchemaApplier({
    baseUrl: 'https://cms.example.test', accessToken: 'server-only-token',
    schemaPlan: { collections: [], fields: [], roles: [{ key: 'read_only_manager', name: 'Read only manager', admin: false }] },
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET', body: options.body };
      if (request.url.pathname === '/collections') return Response.json({ data: [] });
      if (request.url.pathname === '/roles') return Response.json({ data: [{ id: 'role-1', name: 'Read only manager' }] });
      if (request.url.pathname === '/policies') return Response.json({ data: [{ id: 'policy-1', name: 'Ruijun read_only_manager' }] });
      if (request.url.pathname === '/access') return Response.json({ data: [{ role: 'role-1', policy: 'policy-1' }] });
      if (request.url.pathname === '/permissions' && request.method === 'GET') return Response.json({ data: [] });
      if (request.url.pathname === '/permissions' && request.method === 'POST') {
        permissionRequests.push(JSON.parse(request.body));
        return Response.json({ data: {} });
      }
      throw new Error(`Unexpected request ${request.method} ${request.url.pathname}`);
    }
  });

  await applier.apply();

  const clickPermission = permissionRequests.find((permission) => permission.collection === 'service_entry_clicks');
  assert.deepEqual({ action: clickPermission.action, fields: clickPermission.fields }, { action: 'read', fields: ['entry_type', 'source_page'] });
  assert.ok(!permissionRequests.some((permission) => permission.collection === 'leads'));
  assert.ok(permissionRequests.some((permission) => permission.collection === 'content_versions'));
  assert.ok(permissionRequests.every((permission) => permission.action === 'read'));
});

test('Directus schema applier gives content editors bounded file upload access for public media candidates', async () => {
  const permissionRequests = [];
  const applier = createDirectusSchemaApplier({
    baseUrl: 'https://cms.example.test', accessToken: 'server-only-token',
    schemaPlan: { collections: [], fields: [], roles: [{ key: 'content_editor', name: 'Content editor', admin: false }] },
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET', body: options.body };
      if (request.url.pathname === '/collections') return Response.json({ data: [] });
      if (request.url.pathname === '/roles') return Response.json({ data: [{ id: 'role-1', name: 'Content editor' }] });
      if (request.url.pathname === '/policies') return Response.json({ data: [{ id: 'policy-1', name: 'Ruijun content_editor' }] });
      if (request.url.pathname === '/access') return Response.json({ data: [{ role: 'role-1', policy: 'policy-1' }] });
      if (request.url.pathname === '/permissions' && request.method === 'GET') return Response.json({ data: [] });
      if (request.url.pathname === '/permissions' && request.method === 'POST') {
        permissionRequests.push(JSON.parse(request.body));
        return Response.json({ data: {} });
      }
      throw new Error(`Unexpected request ${request.method} ${request.url.pathname}`);
    }
  });

  await applier.apply();

  const createFile = permissionRequests.find((permission) => permission.collection === 'directus_files' && permission.action === 'create');
  const readFile = permissionRequests.find((permission) => permission.collection === 'directus_files' && permission.action === 'read');
  assert.deepEqual(createFile.fields, ['id', 'title', 'filename_download', 'type', 'filesize', 'storage']);
  assert.deepEqual(readFile.permissions, { uploaded_by: { _eq: '$CURRENT_USER' } });
});

test('Directus schema applier constrains sales users to claimable or owned leads and repairs existing broad permissions', async () => {
  const updates = [];
  const applier = createDirectusSchemaApplier({
    baseUrl: 'https://cms.example.test', accessToken: 'server-only-token',
    schemaPlan: { collections: [], fields: [], roles: [{ key: 'sales_user', name: 'Sales', admin: false }] },
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET', body: options.body };
      if (request.url.pathname === '/collections') return Response.json({ data: [] });
      if (request.url.pathname === '/roles') return Response.json({ data: [{ id: 'role-1', name: 'Sales' }] });
      if (request.url.pathname === '/policies') return Response.json({ data: [{ id: 'policy-1', name: 'Ruijun sales_user' }] });
      if (request.url.pathname === '/access') return Response.json({ data: [{ role: 'role-1', policy: 'policy-1' }] });
      if (request.url.pathname === '/permissions' && request.method === 'GET') return Response.json({ data: [
        { id: 'read-leads', policy: 'policy-1', collection: 'leads', action: 'read', permissions: {}, validation: {}, presets: {}, fields: ['*'] },
        { id: 'update-leads', policy: 'policy-1', collection: 'leads', action: 'update', permissions: {}, validation: {}, presets: {}, fields: ['*'] }
      ] });
      if (request.url.pathname.startsWith('/permissions/') && request.method === 'PATCH') {
        updates.push({ id: request.url.pathname.split('/').at(-1), body: JSON.parse(request.body) });
        return Response.json({ data: {} });
      }
      throw new Error(`Unexpected request ${request.method} ${request.url.pathname}`);
    }
  });

  const result = await applier.apply();
  assert.equal(result.permissions.updated, 2);
  assert.deepEqual(updates, [
    {
      id: 'read-leads',
      body: {
        permissions: { _or: [{ owner: { _null: true } }, { owner: { _eq: '$CURRENT_USER' } }] },
        validation: {}, presets: {},
        fields: ['id', 'lead_reference', 'lead_type', 'source_page', 'source_campaign', 'name', 'phone', 'company', 'email', 'requirement', 'product_series', 'product_model', 'attachment_ids', 'owner', 'activity_log', 'follow_up_note', 'consent_at', 'status', 'publication_state', 'date_created', 'date_updated']
      }
    },
    {
      id: 'update-leads',
      body: {
        permissions: { _or: [{ owner: { _null: true } }, { owner: { _eq: '$CURRENT_USER' } }] },
        validation: { owner: { _eq: '$CURRENT_USER' } }, presets: { owner: '$CURRENT_USER' },
        fields: ['owner', 'status', 'follow_up_note', 'activity_log']
      }
    }
  ]);
});

test('Directus schema applier grants sales users the lead primary key needed by item-detail routes', async () => {
  const permissionRequests = [];
  const applier = createDirectusSchemaApplier({
    baseUrl: 'https://cms.example.test', accessToken: 'server-only-token',
    schemaPlan: { collections: [], fields: [], roles: [{ key: 'sales_user', name: 'Sales', admin: false }] },
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET', body: options.body };
      if (request.url.pathname === '/collections') return Response.json({ data: [] });
      if (request.url.pathname === '/roles') return Response.json({ data: [{ id: 'role-1', name: 'Sales' }] });
      if (request.url.pathname === '/policies') return Response.json({ data: [{ id: 'policy-1', name: 'Ruijun sales_user' }] });
      if (request.url.pathname === '/access') return Response.json({ data: [{ role: 'role-1', policy: 'policy-1' }] });
      if (request.url.pathname === '/permissions' && request.method === 'GET') return Response.json({ data: [] });
      if (request.url.pathname === '/permissions' && request.method === 'POST') {
        permissionRequests.push(JSON.parse(request.body));
        return Response.json({ data: {} });
      }
      throw new Error(`Unexpected request ${request.method} ${request.url.pathname}`);
    }
  });

  await applier.apply();

  const leadRead = permissionRequests.find((permission) => permission.collection === 'leads' && permission.action === 'read');
  assert.ok(leadRead.fields.includes('id'));
});
