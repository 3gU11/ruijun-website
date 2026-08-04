import assert from 'node:assert/strict';
import test from 'node:test';

const {
  SERVICE_EXIT_NOTICE,
  createServiceEntryClick,
  hasConfirmedServiceExit,
  markServiceExitConfirmed
} = await import('../shared/service-exit.mjs');

test('service exit click data only contains an allowed entry type and a clean source path', () => {
  assert.deepEqual(createServiceEntryClick('request', '/service'), { entryType: 'request', sourcePath: '/service' });
  assert.equal(createServiceEntryClick('admin', '/service'), null);
  assert.equal(createServiceEntryClick('request', '/service?machineId=RJ-001'), null);
  assert.equal(createServiceEntryClick('request', 'https://example.test/service'), null);
});

test('service exit confirmation is remembered only for the current browser session', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };

  assert.equal(SERVICE_EXIT_NOTICE, '即将进入瑞钧售后服务系统');
  assert.equal(hasConfirmedServiceExit(storage), false);
  markServiceExitConfirmed(storage);
  assert.equal(hasConfirmedServiceExit(storage), true);
  assert.equal(hasConfirmedServiceExit(null), false);
});
