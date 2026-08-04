import assert from 'node:assert/strict';
import test from 'node:test';

const { buildServiceEntryDrafts, createDirectusServiceEntrySeeder } = await import('../import/service-entry-drafts.mjs');

test('service entry drafts preserve all repair routes as unpublished CMS configuration', () => {
  const entries = buildServiceEntryDrafts('https://repair.example.test');

  assert.deepEqual(entries.map((entry) => entry.entry_type), ['support', 'request', 'warranty', 'requests']);
  assert.deepEqual(entries.map((entry) => entry.url), [
    'https://repair.example.test/support', 'https://repair.example.test/repair/new',
    'https://repair.example.test/warranty', 'https://repair.example.test/requests'
  ]);
  assert.ok(entries.every((entry) => entry.status === 'draft' && entry.publication_state === 'unpublished'));
  assert.ok(entries.every((entry) => entry.enabled === false));
});

test('Directus service entry seed upserts drafts by stable entry type', async () => {
  const calls = [];
  const seeder = createDirectusServiceEntrySeeder({
    baseUrl: 'https://cms.example.test', accessToken: 'server-only-token', repairSystemBaseUrl: 'https://repair.example.test',
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: new URL(url), method: options.method || 'GET', body: options.body });
      if ((options.method || 'GET') === 'GET') return Response.json({ data: [] });
      return Response.json({ data: { id: 'created' } });
    }
  });

  assert.deepEqual(await seeder.seed(), { created: 4, updated: 0 });
  const writes = calls.filter((call) => call.method === 'POST');
  assert.equal(writes.length, 4);
  assert.ok(writes.every((call) => call.url.pathname === '/items/external_service_entries'));
  assert.ok(writes.every((call) => JSON.parse(call.body).enabled === false));
});
