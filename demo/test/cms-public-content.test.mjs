import assert from 'node:assert/strict';
import test from 'node:test';

const { createCmsPublicContentClient, CmsUnavailableError } = await import('../cms-public-content.mjs');

const published = {
  series_code: 'fr-pro', slug: 'fr-pro', name: 'FR (pro)', sort_order: 2,
  status: 'published', publication_state: 'published', published_at: '2026-07-30T00:00:00.000Z'
};

test('public content client returns only published records even when an upstream response is over-broad', async () => {
  let requestedUrl;
  const client = createCmsPublicContentClient({
    endpoint: 'https://cms.example.test/items/product_series',
    now: () => Date.parse('2026-07-31T00:00:00.000Z'),
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return new Response(JSON.stringify({ data: [published, { ...published, series_code: 'draft', status: 'draft' }] }), { status: 200 });
    }
  });

  const result = await client.listProductSeries();

  assert.deepEqual(result, { data: [published], cache: 'fresh' });
  assert.equal(requestedUrl.searchParams.get('filter[status][_eq]'), 'published');
  assert.equal(requestedUrl.searchParams.get('filter[publication_state][_eq]'), 'published');
});

test('public content client serves the most recent valid cache only when CMS becomes unavailable', async () => {
  let calls = 0;
  const client = createCmsPublicContentClient({
    endpoint: 'https://cms.example.test/items/product_series',
    cacheTtlMs: 0,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return new Response(JSON.stringify({ data: [published] }), { status: 200 });
      throw new Error('CMS offline');
    }
  });

  await client.listProductSeries();
  const cached = await client.listProductSeries();

  assert.deepEqual(cached, { data: [published], cache: 'stale' });
});

test('public content client never fabricates public content when CMS is unavailable without a cache', async () => {
  const client = createCmsPublicContentClient({
    endpoint: 'https://cms.example.test/items/product_series',
    fetchImpl: async () => { throw new Error('CMS offline'); }
  });

  await assert.rejects(client.listProductSeries(), CmsUnavailableError);
});
