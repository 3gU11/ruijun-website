import assert from 'node:assert/strict';
import test from 'node:test';

const { resolveServiceEntry, shouldEnableServiceEntries } = await import('../shared/service-assistant.mjs');

test('service assistant only resolves configured repairsys entries', () => {
  const entries = { request: 'https://repair.example/repair/new', requests: 'https://repair.example/requests' };
  assert.equal(resolveServiceEntry(entries, 'request'), 'https://repair.example/repair/new');
  assert.equal(resolveServiceEntry(entries, 'warranty'), null);
  assert.equal(resolveServiceEntry(entries, '../admin'), null);
});

test('service assistant enables external entries only after a successful repairsys health probe', () => {
  assert.equal(shouldEnableServiceEntries(true), true);
  assert.equal(shouldEnableServiceEntries(false), false);
  assert.equal(shouldEnableServiceEntries(undefined), false);
  assert.equal(shouldEnableServiceEntries('true'), false);
});
