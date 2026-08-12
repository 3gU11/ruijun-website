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

  assert.deepEqual(result, {
    product_series: { created: 7, updated: 0 },
    product_models: { created: 29, updated: 0 },
    product_parameters: { created: 190, updated: 0, skippedProtected: 0 }
  });
  const writes = calls.filter((call) => call.method === 'POST');
  assert.equal(writes.length, 226);
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

  assert.deepEqual(result, {
    product_series: { created: 0, updated: 1 },
    product_models: { created: 0, updated: 0 },
    product_parameters: { created: 0, updated: 0, skippedProtected: 0 }
  });
  const update = calls.find((call) => call.method === 'PATCH');
  assert.equal(update.url.pathname, '/items/product_series/existing-id');
});

test('Directus product parameter seed uses a composite model/field key and protects reviewed records', async () => {
  const calls = [];
  const seeder = createDirectusProductSeeder({
    baseUrl: 'https://cms.example.test',
    accessToken: 'server-only-token',
    fetchImpl: async (url, options = {}) => {
      const parsed = new URL(url);
      calls.push({ url: parsed, ...options });
      if ((options.method || 'GET') === 'GET') {
        if (parsed.pathname === '/items/product_parameters') {
          return Response.json({ data: [{ id: 'reviewed-parameter', status: 'review', publication_state: 'unpublished' }] });
        }
        return Response.json({ data: [] });
      }
      return Response.json({ data: { id: 'created' } });
    }
  });

  const result = await seeder.seed({
    series: [],
    models: [{
      code: 'fr400xs-auto', name: 'FR400XS (Auto)', seriesCode: 'fr-xs-auto',
      sourceDocument: 'FR-XS.pdf', parameters: { xyTravelMm: '400*290' }
    }]
  });

  assert.deepEqual(result.product_parameters, { created: 0, updated: 0, skippedProtected: 1 });
  const lookup = calls.find((call) => call.url.pathname === '/items/product_parameters' && call.method === 'GET');
  assert.equal(lookup.url.searchParams.get('filter[model_code][_eq]'), 'fr400xs-auto');
  assert.equal(lookup.url.searchParams.get('filter[field_name][_eq]'), 'XY 行程');
  assert.equal(calls.some((call) => call.url.pathname === '/items/product_parameters/reviewed-parameter' && call.method === 'PATCH'), false);
});
