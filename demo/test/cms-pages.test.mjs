import assert from 'node:assert/strict';
import test from 'node:test';

const { createCmsPublicContentClient } = await import('../cms-public-content.mjs');

const publishedPage = {
  slug: 'about', title: '关于瑞钧', language: 'zh-CN', sections: [{ type: 'hero', title: '关于瑞钧' }],
  status: 'published', publication_state: 'published', published_at: '2026-07-30T00:00:00.000Z'
};

test('public CMS client returns one published page by an allowed slug only', async () => {
  let requestedUrl;
  const client = createCmsPublicContentClient({
    productSeriesEndpoint: 'https://cms.example.test/items/product_series',
    pagesEndpoint: 'https://cms.example.test/items/pages',
    now: () => Date.parse('2026-07-31T00:00:00.000Z'),
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return new Response(JSON.stringify({ data: [publishedPage, { ...publishedPage, status: 'draft' }] }), { status: 200 });
    }
  });

  const result = await client.getPage('about');

  assert.deepEqual(result, { data: publishedPage, cache: 'fresh' });
  assert.equal(requestedUrl.searchParams.get('filter[slug][_eq]'), 'about');
  assert.equal(requestedUrl.searchParams.get('limit'), '1');
});

test('public CMS client rejects an unsafe page slug before querying CMS', async () => {
  const client = createCmsPublicContentClient({
    productSeriesEndpoint: 'https://cms.example.test/items/product_series',
    pagesEndpoint: 'https://cms.example.test/items/pages'
  });

  await assert.rejects(client.getPage('../admin'), /page slug/i);
});
