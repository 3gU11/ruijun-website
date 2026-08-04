import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const { createDirectusProductSeeder } = await import('../import/directus-product-seed.mjs');
const catalogUrl = new URL('../../demo/data/product-catalog.json', import.meta.url);

test('Directus product seed upserts every legacy record as an unpublished draft', async () => {
  const calls = [];
  const seeder = createDirectusProductSeeder({
    baseUrl: 'https://cms.example.test',
    accessToken: 'server-only-token',
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: new URL(url), ...options });
      if ((options.method || 'GET') === 'GET') return new Response(JSON.stringify({ data: [] }), { status: 200 });
      return new Response(JSON.stringify({ data: { id: 'created' } }), { status: 200 });
    }
  });
  const catalog = JSON.parse(await readFile(catalogUrl, 'utf8'));

  const result = await seeder.seed(catalog);

  assert.deepEqual(result, { product_series: { created: 7, updated: 0 }, product_models: { created: 29, updated: 0 } });
  const writes = calls.filter((call) => call.method === 'POST');
  assert.equal(writes.length, 36);
  assert.ok(writes.every((call) => call.headers.Authorization === 'Bearer server-only-token'));
  assert.ok(writes.every((call) => {
    const body = JSON.parse(call.body);
    return body.status === 'draft' && body.publication_state === 'unpublished';
  }));
});

test('Directus product seed updates a matching draft instead of creating a duplicate record', async () => {
  const calls = [];
  const seeder = createDirectusProductSeeder({
    baseUrl: 'https://cms.example.test',
    accessToken: 'server-only-token',
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: new URL(url), ...options });
      if ((options.method || 'GET') === 'GET') return new Response(JSON.stringify({ data: [{ id: 'existing-id' }] }), { status: 200 });
      return new Response(JSON.stringify({ data: { id: 'existing-id' } }), { status: 200 });
    }
  });

  const result = await seeder.seed({ series: [{ code: 'fr-pro', name: 'FR (pro)' }], models: [] });

  assert.deepEqual(result, { product_series: { created: 0, updated: 1 }, product_models: { created: 0, updated: 0 } });
  const update = calls.find((call) => call.method === 'PATCH');
  assert.equal(update.url.pathname, '/items/product_series/existing-id');
});
