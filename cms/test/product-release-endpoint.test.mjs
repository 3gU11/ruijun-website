import assert from 'node:assert/strict';
import test from 'node:test';

const { registerProductReleaseEndpoint } = await import('../extensions/product-release-endpoint/dist/index.js');

function responseCapture() {
  const capture = { statusCode: null, body: null };
  return { capture, response: { status(code) { capture.statusCode = code; return this; }, json(body) { capture.body = body; return this; } } };
}

test('product release endpoint exposes readiness blockers without writing an empty release', async () => {
  const handlers = new Map();
  const tables = {
    product_series: [], product_models: [], product_parameters: [], product_release_snapshots: []
  };
  const database = (table) => ({
    where() { return this; }, orderBy() { return this; }, first() { return Promise.resolve(tables[table]?.[0] || null); },
    select() { return Promise.resolve(tables[table] || []); }
  });
  registerProductReleaseEndpoint({ get: (path, handler) => handlers.set(`GET ${path}`, handler), post: (path, handler) => handlers.set(`POST ${path}`, handler) }, { database });
  const { capture, response } = responseCapture();
  await handlers.get('GET /readiness')({ accountability: { user: 'publisher-1', admin: true } }, response, (error) => { throw error; });
  assert.equal(capture.statusCode, 200);
  assert.deepEqual(capture.body.data.issues, ['NO_PUBLISHED_MODELS']);
  assert.equal(capture.body.data.counts.models, 0);
});

function mutableDatabase(tables) {
  function database(table) {
    let filters = {};
    let order = null;
    let maximum = null;
    const matching = () => {
      const rows = (tables[table] || []).filter((row) => Object.entries(filters).every(([key, value]) => String(row[key]) === String(value)));
      if (order) rows.sort((left, right) => (Number(left[order.field]) - Number(right[order.field])) * (order.direction === 'desc' ? -1 : 1));
      return maximum == null ? rows : rows.slice(0, maximum);
    };
    return {
      where(value) { filters = { ...filters, ...value }; return this; },
      orderBy(field, direction = 'asc') { order = { field, direction }; return this; },
      limit(value) { maximum = Number(value); return this; },
      first() {
        const rows = matching();
        return Promise.resolve(rows[0] || null);
      },
      select() { return Promise.resolve(matching()); },
      update(value) { for (const row of matching()) Object.assign(row, value); return Promise.resolve(matching().length); },
      insert(value) {
        const row = { id: (tables[table]?.length || 0) + 1, ...value };
        tables[table].push(row);
        return Promise.resolve([row.id]);
      }
    };
  }
  database.transaction = async (callback) => callback(database);
  return database;
}

test('product release remains published when cache invalidation fails and supports an audited retry', async () => {
  const handlers = new Map();
  const published = { status: 'published', publication_state: 'published', published_at: '2026-08-01T00:00:00.000Z' };
  const tables = {
    product_series: [{ ...published, series_code: 'fr-xs', slug: 'fr-xs', name: 'FR-XS' }],
    product_models: [{ ...published, series_code: 'fr-xs', model_code: 'fr400xs', slug: 'fr400xs', name: 'FR400XS' }],
    product_parameters: [{ ...published, model_code: 'fr400xs', field_name: 'XY 行程', value: '400*290' }],
    product_release_snapshots: []
  };
  const database = mutableDatabase(tables);
  const deliveries = [];
  let websiteAvailable = false;
  registerProductReleaseEndpoint({
    get: (path, handler) => handlers.set(`GET ${path}`, handler),
    post: (path, handler) => handlers.set(`POST ${path}`, handler)
  }, {
    database,
    env: {
      WEBSITE_CACHE_INVALIDATION_URL: 'http://127.0.0.1:4173/api/internal/v1/cms/cache-invalidate',
      CMS_WEBHOOK_SECRET: 'test-secret'
    },
    fetchImpl: async (url, options) => {
      deliveries.push({ url, options });
      return websiteAvailable ? Response.json({ invalidated: ['products'] }) : new Response('', { status: 503 });
    }
  });

  const publishedResponse = responseCapture();
  await handlers.get('POST /publish')({ accountability: { user: 'publisher-1', admin: true }, body: { releaseNote: 'E2E release' } }, publishedResponse.response, (error) => { throw error; });

  assert.equal(publishedResponse.capture.statusCode, 201);
  assert.equal(tables.product_release_snapshots[0].status, 'published');
  assert.equal(tables.product_release_snapshots[0].cache_invalidation_status, 'failed');
  assert.equal(tables.product_release_snapshots[0].cache_invalidation_attempts, 1);
  assert.equal(JSON.parse(deliveries[0].options.body).collection, 'product_release_snapshots');
  assert.equal(deliveries[0].options.headers.Authorization, 'Bearer test-secret');

  websiteAvailable = true;
  const retryResponse = responseCapture();
  await handlers.get('POST /:id/cache-invalidate')({ accountability: { user: 'publisher-1', admin: true }, params: { id: 1 } }, retryResponse.response, (error) => { throw error; });

  assert.equal(retryResponse.capture.statusCode, 200);
  assert.equal(tables.product_release_snapshots[0].cache_invalidation_status, 'succeeded');
  assert.equal(tables.product_release_snapshots[0].cache_invalidation_attempts, 2);
  assert.ok(tables.product_release_snapshots[0].cache_invalidated_at);
  assert.deepEqual(JSON.parse(tables.product_release_snapshots[0].publication_log).map((entry) => entry.action), [
    'product_release_published', 'product_cache_invalidation_failed', 'product_cache_invalidated'
  ]);
});

test('product release history is metadata-only and restoring an archived snapshot creates an audited new active version', async () => {
  const handlers = new Map();
  const firstSnapshot = {
    schema_version: 1, release_key: 'main', version: 1, generated_at: '2026-08-01T00:00:00.000Z',
    series: [{ series_code: 'fr-xs', slug: 'fr-xs', name: 'FR-XS' }],
    models: [{ series_code: 'fr-xs', model_code: 'fr400xs', slug: 'fr400xs', name: 'FR400XS' }],
    parameters: [{ model_code: 'fr400xs', field_name: 'XY 行程', value: '400*290' }],
    counts: { series: 1, models: 1, parameters: 1 }
  };
  const secondSnapshot = structuredClone(firstSnapshot);
  secondSnapshot.version = 2;
  secondSnapshot.generated_at = '2026-08-02T00:00:00.000Z';
  secondSnapshot.models[0].name = 'FR400XS Updated';
  const tables = {
    directus_roles: [], product_series: [], product_models: [], product_parameters: [],
    product_release_snapshots: [
      {
        id: 1, release_key: 'main', version: 1, source_hash: 'a'.repeat(64), snapshot: JSON.stringify(firstSnapshot),
        release_note: 'Initial', published_by: 'publisher-1', published_at: '2026-08-01T00:00:00.000Z',
        status: 'archived', publication_state: 'private', cache_invalidation_status: 'succeeded', publication_log: '[]'
      },
      {
        id: 2, release_key: 'main', version: 2, source_hash: 'b'.repeat(64), snapshot: JSON.stringify(secondSnapshot),
        release_note: 'Updated', published_by: 'publisher-1', published_at: '2026-08-02T00:00:00.000Z',
        status: 'published', publication_state: 'published', cache_invalidation_status: 'succeeded', publication_log: '[]'
      }
    ]
  };
  const database = mutableDatabase(tables);
  registerProductReleaseEndpoint({
    get: (path, handler) => handlers.set(`GET ${path}`, handler),
    post: (path, handler) => handlers.set(`POST ${path}`, handler)
  }, {
    database,
    env: {
      WEBSITE_CACHE_INVALIDATION_URL: 'http://127.0.0.1:4173/api/internal/v1/cms/cache-invalidate',
      CMS_WEBHOOK_SECRET: 'test-secret'
    },
    fetchImpl: async () => Response.json({ invalidated: ['products'] })
  });

  const historyResponse = responseCapture();
  await handlers.get('GET /history')({ accountability: { user: 'publisher-1', admin: true } }, historyResponse.response, (error) => { throw error; });
  assert.equal(historyResponse.capture.statusCode, 200);
  assert.deepEqual(historyResponse.capture.body.data.map((release) => release.version), [2, 1]);
  assert.equal(historyResponse.capture.body.data[0].is_active, true);
  assert.equal(historyResponse.capture.body.data[0].can_restore, false);
  assert.equal(historyResponse.capture.body.data[1].can_restore, true);
  assert.equal(Object.hasOwn(historyResponse.capture.body.data[1], 'snapshot'), false);

  const currentRestoreResponse = responseCapture();
  await handlers.get('POST /:id/restore')({ accountability: { user: 'publisher-1', admin: true }, params: { id: 2 }, body: { restoreNote: 'Should be rejected' } }, currentRestoreResponse.response, (error) => { throw error; });
  assert.equal(currentRestoreResponse.capture.statusCode, 409);

  const restoreResponse = responseCapture();
  await handlers.get('POST /:id/restore')({ accountability: { user: 'publisher-1', admin: true }, params: { id: 1 }, body: { restoreNote: '回退错误的产品命名调整' } }, restoreResponse.response, (error) => { throw error; });
  assert.equal(restoreResponse.capture.statusCode, 201);
  assert.equal(restoreResponse.capture.body.data.version, 3);
  assert.equal(restoreResponse.capture.body.data.restored_from_version, 1);
  assert.equal(restoreResponse.capture.body.data.cache_invalidation.status, 'succeeded');
  assert.equal(tables.product_release_snapshots[1].status, 'archived');
  const restored = tables.product_release_snapshots[2];
  assert.equal(restored.status, 'published');
  assert.equal(restored.version, 3);
  assert.equal(restored.restored_from_release_id, '1');
  assert.equal(restored.restore_note, '回退错误的产品命名调整');
  assert.equal(JSON.parse(restored.snapshot).models[0].name, 'FR400XS');
  const log = JSON.parse(restored.publication_log);
  assert.deepEqual(log.map((entry) => entry.action), ['product_release_restored', 'product_cache_invalidated']);
  assert.deepEqual(log[0].change_summary.models, { added: 0, removed: 0, changed: 1, fields: ['name'], fields_truncated: false });
});

test('product restore rejects short reasons, damaged snapshots, and non-publisher roles', async () => {
  const handlers = new Map();
  const tables = {
    directus_roles: [{ id: 'editor-role', name: '内容编辑' }],
    product_series: [], product_models: [], product_parameters: [],
    product_release_snapshots: [
      { id: 1, release_key: 'main', version: 1, snapshot: '{}', status: 'archived', publication_state: 'private' },
      { id: 2, release_key: 'main', version: 2, snapshot: '{}', status: 'published', publication_state: 'published' }
    ]
  };
  registerProductReleaseEndpoint({
    get: (path, handler) => handlers.set(`GET ${path}`, handler),
    post: (path, handler) => handlers.set(`POST ${path}`, handler)
  }, { database: mutableDatabase(tables) });

  const forbidden = responseCapture();
  await handlers.get('GET /history')({ accountability: { user: 'editor-1', role: 'editor-role' } }, forbidden.response, (error) => { throw error; });
  assert.equal(forbidden.capture.statusCode, 403);

  const shortReason = responseCapture();
  await handlers.get('POST /:id/restore')({ accountability: { user: 'publisher-1', admin: true }, params: { id: 1 }, body: { restoreNote: '短' } }, shortReason.response, (error) => { throw error; });
  assert.equal(shortReason.capture.statusCode, 400);
  assert.equal(shortReason.capture.body.errors[0].extensions.code, 'PRODUCT_RESTORE_NOTE_INVALID');

  const damaged = responseCapture();
  await handlers.get('POST /:id/restore')({ accountability: { user: 'publisher-1', admin: true }, params: { id: 1 }, body: { restoreNote: '恢复历史损坏版本' } }, damaged.response, (error) => { throw error; });
  assert.equal(damaged.capture.statusCode, 422);
  assert.equal(damaged.capture.body.errors[0].extensions.code, 'PRODUCT_RELEASE_HISTORY_INVALID');
});
