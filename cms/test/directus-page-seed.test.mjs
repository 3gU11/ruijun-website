import assert from 'node:assert/strict';
import test from 'node:test';

const { createDirectusPageSeeder } = await import('../import/directus-page-seed.mjs');

test('Directus page seed upserts the three website page drafts without publishing them', async () => {
  const calls = [];
  const seeder = createDirectusPageSeeder({
    baseUrl: 'https://cms.example.test', accessToken: 'server-only-token',
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: new URL(url), ...options });
      if ((options.method || 'GET') === 'GET') return new Response(JSON.stringify({ data: [] }), { status: 200 });
      return new Response(JSON.stringify({ data: { id: 'created' } }), { status: 200 });
    }
  });

  const result = await seeder.seed();

  assert.deepEqual(result, { created: 3, updated: 0 });
  const writes = calls.filter((call) => call.method === 'POST');
  assert.equal(writes.length, 3);
  assert.ok(writes.every((call) => call.url.pathname === '/items/pages'));
  assert.ok(writes.every((call) => {
    const body = JSON.parse(call.body);
    return body.status === 'draft' && body.publication_state === 'unpublished';
  }));
});
