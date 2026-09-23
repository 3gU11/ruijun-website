import assert from 'node:assert/strict';
import test from 'node:test';

const { registerContentVersionRestoreEndpoint } = await import('../extensions/content-version-restore/src/index.js');

test('version endpoint exposes a bounded, publisher-only history with parsed diff metadata', async () => {
  const handlers = new Map();
  const router = { get: (path, callback) => handlers.set(path, callback), post() {} };
  const versionQuery = {
    where() { return this; },
    orderBy() { return this; },
    limit(value) {
      assert.equal(value, 50);
      return Promise.resolve([{
        id: 9, content_collection: 'product_models', content_item_id: '7', source_status: 'draft',
        source_publication_state: 'unpublished', snapshot: JSON.stringify({ name: 'Prior model' }),
        changed_fields: JSON.stringify(['name', 'status']), action: 'submitted_for_review', actor: 'editor-1',
        created_at: '2026-08-01T10:00:00.000Z', status: 'available'
      }]);
    }
  };
  const database = (table) => {
    if (table === 'directus_roles') return { where() { return this; }, async first() { return { name: '发布人员' }; } };
    if (table === 'content_versions') return versionQuery;
    throw new Error(`Unexpected table ${table}`);
  };
  registerContentVersionRestoreEndpoint(router, { database });
  let response;
  await handlers.get('/')({ query: {}, accountability: { user: 'publisher-1', role: 'role-1' } }, {
    status(code) { assert.equal(code, 200); return this; }, json(value) { response = value; }
  }, (error) => { throw error; });

  assert.deepEqual(response.data, [{
    id: 9, content_collection: 'product_models', content_item_id: '7', source_status: 'draft',
    source_publication_state: 'unpublished', snapshot: { name: 'Prior model' }, changed_fields: ['name', 'status'],
    action: 'submitted_for_review', actor: 'editor-1', created_at: '2026-08-01T10:00:00.000Z', status: 'available',
    restore_note: null, restored_by: null, restored_at: null
  }]);
});

test('version endpoint recognizes the current unified review-management publisher role', async () => {
  const handlers = new Map();
  const router = { get: (path, callback) => handlers.set(path, callback), post() {} };
  const database = (table) => {
    if (table === 'directus_roles') return { where() { return this; }, async first() { return { name: '审核管理' }; } };
    if (table === 'content_versions') return { where() { return this; }, orderBy() { return this; }, limit() { return Promise.resolve([]); } };
    throw new Error(`Unexpected table ${table}`);
  };
  registerContentVersionRestoreEndpoint(router, { database });
  let response;
  await handlers.get('/')({ query: {}, accountability: { user: 'publisher-1', role: 'role-1' } }, {
    status(code) { assert.equal(code, 200); return this; }, json(value) { response = value; }
  }, (error) => { throw error; });
  assert.deepEqual(response.data, []);
});

test('version endpoint returns a historical snapshot alongside the current content for field comparison', async () => {
  const handlers = new Map();
  const router = { get: (path, callback) => handlers.set(path, callback), post() {} };
  const database = (table) => {
    if (table === 'directus_roles') return { where() { return this; }, async first() { return { name: '发布人员' }; } };
    if (table === 'content_versions') return {
      where() { return this; },
      async first() {
        return {
          id: 9, content_collection: 'product_models', content_item_id: '7', source_status: 'draft',
          source_publication_state: 'unpublished', snapshot: JSON.stringify({ name: 'Prior model', status: 'draft' }),
          changed_fields: JSON.stringify(['name']), action: 'submitted_for_review', actor: 'editor-1',
          created_at: '2026-08-01T10:00:00.000Z', status: 'available'
        };
      }
    };
    if (table === 'product_models') return {
      where() { return this; },
      async first() { return { id: 7, name: 'Published model', status: 'published', date_updated: '2026-08-01T12:00:00.000Z' }; }
    };
    throw new Error(`Unexpected table ${table}`);
  };
  registerContentVersionRestoreEndpoint(router, { database });
  let response;
  await handlers.get('/:versionId')({ params: { versionId: '9' }, accountability: { user: 'publisher-1', role: 'role-1' } }, {
    status(code) { assert.equal(code, 200); return this; }, json(value) { response = value; }
  }, (error) => { throw error; });

  assert.deepEqual(response.data, {
    version: {
      id: 9, content_collection: 'product_models', content_item_id: '7', source_status: 'draft',
      source_publication_state: 'unpublished', snapshot: { name: 'Prior model', status: 'draft' }, changed_fields: ['name'],
      action: 'submitted_for_review', actor: 'editor-1', created_at: '2026-08-01T10:00:00.000Z', status: 'available',
      restore_note: null, restored_by: null, restored_at: null
    },
    current: { name: 'Published model', status: 'published' }
  });
});

test('restore endpoint allows publishers to restore a snapshot only as an unpublished draft', async () => {
  let handler;
  const updates = [];
  const router = { get() {}, post: (_path, callback) => { handler = callback; } };
  const database = (table) => ({
    where() { return this; },
    async first() {
      if (table === 'directus_roles') return { name: '发布人员' };
      if (table === 'content_versions') return { id: 9, content_collection: 'product_models', content_item_id: '7', snapshot: JSON.stringify({ model_code: 'OLD', name: 'Old model', parameters: { travel: '400' }, status: 'published', publication_state: 'published' }) };
      return { id: 7, status: 'published', publication_state: 'published', publication_log: [] };
    },
    update(value) { updates.push({ table, value }); return Promise.resolve(1); }
  });
  registerContentVersionRestoreEndpoint(router, { database });
  let response;
  await handler({ params: { versionId: '9' }, body: { restoreNote: 'Restore approved version.' }, accountability: { user: 'publisher-1', role: 'role-1' } }, { status(code) { assert.equal(code, 200); return this; }, json(value) { response = value; } }, (error) => { throw error; });

  assert.deepEqual(response.data, { content_collection: 'product_models', content_item_id: '7', status: 'draft' });
  assert.equal(updates[0].table, 'product_models');
  assert.equal(updates[0].value.status, 'draft');
  assert.deepEqual(JSON.parse(updates[0].value.parameters), { travel: '400' });
  assert.equal(updates[1].table, 'content_versions');
  assert.equal(updates[1].value.status, 'restored');
  assert.match(updates[1].value.restored_at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
});
