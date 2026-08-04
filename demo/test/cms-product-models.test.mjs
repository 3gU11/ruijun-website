import assert from 'node:assert/strict';
import test from 'node:test';

const { createCmsPublicContentClient } = await import('../cms-public-content.mjs');

const publishedModel = {
  series_code: 'fr-pro', model_code: 'fr400xs-pro', name: 'FR400XS (Pro)', parameters: { xyTravelMm: '400*300' },
  status: 'published', publication_state: 'published', published_at: '2026-07-30T00:00:00.000Z'
};

test('public CMS client returns only published models from the requested series', async () => {
  let requestedUrl;
  const client = createCmsPublicContentClient({
    productSeriesEndpoint: 'https://cms.example.test/items/product_series',
    productModelsEndpoint: 'https://cms.example.test/items/product_models',
    now: () => Date.parse('2026-07-31T00:00:00.000Z'),
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return new Response(JSON.stringify({ data: [publishedModel, { ...publishedModel, model_code: 'draft', status: 'draft' }, { ...publishedModel, model_code: 'wrong-series', series_code: 'ft-xs' }] }), { status: 200 });
    }
  });

  const result = await client.listProductModels('fr-pro');

  assert.deepEqual(result, { data: [publishedModel], cache: 'fresh' });
  assert.equal(requestedUrl.searchParams.get('filter[series_code][_eq]'), 'fr-pro');
  assert.equal(requestedUrl.searchParams.get('filter[status][_eq]'), 'published');
});

test('public CMS client rejects malformed product series codes before querying CMS', async () => {
  const client = createCmsPublicContentClient({
    productSeriesEndpoint: 'https://cms.example.test/items/product_series',
    productModelsEndpoint: 'https://cms.example.test/items/product_models'
  });

  await assert.rejects(client.listProductModels('../../private'), /series code/i);
});
