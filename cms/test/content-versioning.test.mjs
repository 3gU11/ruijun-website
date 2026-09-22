import assert from 'node:assert/strict';
import test from 'node:test';

const { buildContentVersion, buildRestoredDraft, databaseDateTime } = await import('../content-workflow/content-versioning.mjs');

const now = () => new Date('2026-08-01T10:00:00.000Z');

test('database datetime values use MySQL DATETIME syntax at the persistence boundary', () => {
  assert.match(databaseDateTime('2026-08-01T10:00:00.123Z'), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
});

test('content version snapshots exclude Directus internals and retain only changed public-content fields', () => {
  const version = buildContentVersion({
    collection: 'product_models', current: {
      id: 7, model_code: 'RJ-01', name: 'Previous name', status: 'scheduled', publication_state: 'unpublished',
      publication_log: [], date_created: '2026-07-01T00:00:00.000Z', user_updated: 'user-1'
    }, next: { name: 'Published name', status: 'published', publication_state: 'published', published_at: '2026-08-01T10:00:00.000Z', publication_log: [] },
    actorId: 'publisher-1', action: 'published', now
  });

  assert.deepEqual(version, {
    content_collection: 'product_models', content_item_id: '7', source_status: 'scheduled', source_publication_state: 'unpublished',
    snapshot: { model_code: 'RJ-01', name: 'Previous name', status: 'scheduled', publication_state: 'unpublished' },
    changed_fields: ['name', 'publication_state', 'published_at', 'status'], action: 'published', actor: 'publisher-1', created_at: '2026-08-01T10:00:00.000Z'
  });
});

test('restoring a version always creates an unpublished draft with an explicit audit entry', () => {
  const restored = buildRestoredDraft({
    snapshot: { model_code: 'RJ-01', name: 'Previous name', status: 'scheduled', publication_state: 'unpublished' },
    current: { id: 7, status: 'published', publication_state: 'published', publication_log: '[{"action":"published","actor":"publisher-1","at":"2026-08-01T09:00:00.000Z"}]' },
    actorId: 'publisher-2', versionId: 'version-9', restoreNote: 'Restoring approved specification.', now
  });

  assert.deepEqual(restored, {
    model_code: 'RJ-01', name: 'Previous name', status: 'draft', publication_state: 'unpublished', published_at: null,
    review_note: 'Restoring approved specification.',
    publication_log: [
      { action: 'published', actor: 'publisher-1', at: '2026-08-01T09:00:00.000Z' },
      { action: 'restored_from_version', actor: 'publisher-2', at: '2026-08-01T10:00:00.000Z', version_id: 'version-9', note: 'Restoring approved specification.' }
    ]
  });
});
