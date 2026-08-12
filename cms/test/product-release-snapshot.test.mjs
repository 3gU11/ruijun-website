import assert from 'node:assert/strict';
import test from 'node:test';

const {
  buildProductReleaseSnapshot,
  buildRestoredProductReleaseSnapshot,
  diffProductReleaseSnapshots,
  parseProductReleaseSnapshot,
  validateProductReleaseSnapshot
} = await import('../product-release/product-release-snapshot.mjs');

const published = { status: 'published', publication_state: 'published', published_at: '2026-08-01T00:00:00.000Z' };

test('product release snapshot contains one consistent public product version', () => {
  const result = buildProductReleaseSnapshot({
    now: new Date('2026-08-02T00:00:00.000Z'),
    series: [{ ...published, series_code: 'fr-xs', slug: 'fr-xs', name: 'FR-XS', sort_order: 1 }],
    models: [{ ...published, series_code: 'fr-xs', model_code: 'fr400xs', slug: 'fr400xs', name: 'FR400XS' }],
    parameters: [{ ...published, model_code: 'fr400xs', field_name: 'XY 行程', value: '400*290', sort_order: 1 }],
    version: 3
  });

  assert.deepEqual(result.issues, []);
  assert.equal(result.snapshot.version, 3);
  assert.deepEqual(result.snapshot.counts, { series: 1, models: 1, parameters: 1 });
  assert.equal(result.snapshot.models[0].model_code, 'fr400xs');
  assert.equal(result.sourceHash.length, 64);
  assert.deepEqual(parseProductReleaseSnapshot(JSON.stringify(result.snapshot)), result.snapshot);
});

test('product release snapshot rejects models without a published series and parameters without a model', () => {
  const result = buildProductReleaseSnapshot({
    series: [],
    models: [{ ...published, series_code: 'missing', model_code: 'fr400xs', name: 'FR400XS' }],
    parameters: [{ ...published, model_code: 'missing-model', field_name: 'XY 行程', value: '400*290' }]
  });

  assert.ok(result.issues.includes('MODEL_SERIES_MISSING:fr400xs'));
  assert.ok(result.issues.includes('PARAMETER_MODEL_MISSING:missing-model'));
});

test('product release snapshot parser fails closed for malformed records', () => {
  assert.equal(parseProductReleaseSnapshot('{}'), null);
  assert.equal(parseProductReleaseSnapshot(JSON.stringify({ schema_version: 2, series: [], models: [], parameters: [] })), null);
});

test('historical product release validation rejects empty, duplicate, and disconnected product records', () => {
  const invalid = {
    schema_version: 1, release_key: 'main', version: 1, generated_at: '2026-08-01T00:00:00.000Z',
    series: [{ series_code: 'fr' }, { series_code: 'fr' }],
    models: [{ model_code: 'fr400', series_code: 'missing' }],
    parameters: [{ model_code: 'missing-model', field_name: 'XY 行程', value: '400*290' }],
    counts: { series: 1, models: 1, parameters: 1 }
  };

  assert.deepEqual(validateProductReleaseSnapshot('{}'), ['SNAPSHOT_FORMAT_INVALID']);
  const issues = validateProductReleaseSnapshot(invalid);
  assert.ok(issues.includes('SERIES_IDENTIFIER_DUPLICATE:fr'));
  assert.ok(issues.includes('MODEL_SERIES_MISSING:fr400'));
  assert.ok(issues.includes('PARAMETER_MODEL_MISSING:missing-model'));
  assert.ok(issues.includes('SNAPSHOT_COUNTS_INVALID'));
});

test('restoring a historical product snapshot creates a new version and retains a field-level change summary', () => {
  const source = buildProductReleaseSnapshot({
    now: new Date('2026-08-01T00:00:00.000Z'), version: 1,
    series: [{ ...published, series_code: 'fr-xs', slug: 'fr-xs', name: 'FR-XS' }],
    models: [{ ...published, series_code: 'fr-xs', model_code: 'fr400xs', slug: 'fr400xs', name: 'FR400XS' }],
    parameters: [{ ...published, model_code: 'fr400xs', field_name: 'XY 行程', value: '400*290' }]
  });
  const current = structuredClone(source.snapshot);
  current.version = 2;
  current.models[0].name = 'FR400XS Updated';
  current.parameters.push({ model_code: 'fr400xs', field_name: '最大工件重量', value: '300' });
  current.counts.parameters = 2;

  const restored = buildRestoredProductReleaseSnapshot({
    source: source.snapshot, version: 3, now: new Date('2026-08-03T00:00:00.000Z')
  });

  assert.deepEqual(restored.issues, []);
  assert.equal(restored.snapshot.version, 3);
  assert.equal(restored.snapshot.generated_at, '2026-08-03T00:00:00.000Z');
  assert.equal(restored.snapshot.models[0].name, 'FR400XS');
  assert.equal(restored.sourceHash.length, 64);
  assert.deepEqual(diffProductReleaseSnapshots(current, restored.snapshot), {
    series: { added: 0, removed: 0, changed: 0, fields: [], fields_truncated: false },
    models: { added: 0, removed: 0, changed: 1, fields: ['name'], fields_truncated: false },
    parameters: { added: 0, removed: 1, changed: 0, fields: [], fields_truncated: false }
  });
});
