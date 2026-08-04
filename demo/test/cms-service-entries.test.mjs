import assert from 'node:assert/strict';
import test from 'node:test';

const { CmsUnavailableError, createCmsPublicContentClient } = await import('../cms-public-content.mjs');

const publishedEntry = {
  entry_type: 'request', url: 'https://repair.example.test/repair/new', enabled: true,
  open_mode: 'new_tab', status: 'published', publication_state: 'published', published_at: '2026-07-30T00:00:00.000Z'
};

test('public CMS client returns only published and enabled service entries', async () => {
  let requestedUrl;
  const client = createCmsPublicContentClient({
    productSeriesEndpoint: 'https://cms.example.test/items/product_series',
    serviceEntriesEndpoint: 'https://cms.example.test/items/external_service_entries',
    now: () => Date.parse('2026-07-31T00:00:00.000Z'),
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return new Response(JSON.stringify({ data: [publishedEntry, { ...publishedEntry, entry_type: 'draft', status: 'draft' }, { ...publishedEntry, entry_type: 'disabled', enabled: false }] }), { status: 200 });
    }
  });

  const result = await client.listServiceEntries();

  assert.deepEqual(result, { data: [publishedEntry], cache: 'fresh' });
  assert.equal(requestedUrl.searchParams.get('filter[status][_eq]'), 'published');
  assert.equal(requestedUrl.searchParams.get('filter[enabled][_eq]'), 'true');
});

test('public CMS client does not fabricate service entries when CMS is unavailable without cache', async () => {
  const client = createCmsPublicContentClient({
    productSeriesEndpoint: 'https://cms.example.test/items/product_series',
    serviceEntriesEndpoint: 'https://cms.example.test/items/external_service_entries',
    fetchImpl: async () => { throw new Error('CMS offline'); }
  });

  await assert.rejects(client.listServiceEntries(), CmsUnavailableError);
});
