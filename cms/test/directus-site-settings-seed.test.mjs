import assert from 'node:assert/strict';
import test from 'node:test';

const { createDirectusSiteSettingsSeeder } = await import('../import/directus-site-settings-seed.mjs');

test('Directus site settings seed upserts the unpublished global setting by stable key', async () => {
  const writes = [];
  const seeder = createDirectusSiteSettingsSeeder({
    baseUrl: 'https://cms.example.test', accessToken: 'server-only-token',
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET', body: options.body, headers: options.headers };
      if (request.method === 'GET') {
        assert.equal(request.url.searchParams.get('filter[setting_key][_eq]'), 'global');
        return Response.json({ data: [{ id: 9 }] });
      }
      writes.push(request);
      return Response.json({ data: { id: 9 } });
    }
  });

  assert.deepEqual(await seeder.seed(), { created: 0, updated: 1 });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].method, 'PATCH');
  assert.equal(writes[0].url.pathname, '/items/site_settings/9');
  const body = JSON.parse(writes[0].body);
  assert.equal(body.setting_key, 'global');
  assert.equal(body.status, 'draft');
  assert.equal(body.publication_state, 'unpublished');
  assert.equal(writes[0].headers.Authorization, 'Bearer server-only-token');
});
