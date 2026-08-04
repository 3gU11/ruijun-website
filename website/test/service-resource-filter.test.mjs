import assert from 'node:assert/strict';
import test from 'node:test';

const { filterServiceResources } = await import('../shared/service-resource-filter.mjs');

const resources = [
  { source_key: 'manual-xs', applicable_models: ['FR400XS', 'FR500XS'] },
  { source_key: 'guide-large', applicable_models: ['FR1000'] },
  { source_key: 'general', applicable_models: [] }
];

test('service resource filter returns every published resource until a model query is supplied', () => {
  assert.deepEqual(filterServiceResources(resources, ''), resources);
  assert.deepEqual(filterServiceResources(resources, ' FR-400 XS '), [resources[0]]);
});

test('service resource filter matches model codes case-insensitively and never returns malformed records', () => {
  assert.deepEqual(filterServiceResources([...resources, null, { source_key: 'invalid', applicable_models: 'FR400XS' }], 'fr500xs'), [resources[0]]);
  assert.deepEqual(filterServiceResources(resources, 'FR999'), []);
});
