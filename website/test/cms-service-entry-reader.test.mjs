import assert from 'node:assert/strict';
import test from 'node:test';

const { createCmsServiceEntryReader } = await import('../server/services/cms-service-entry-reader.mjs');

const publishedEntry = {
  entry_type: 'request', url: 'https://repair.example.test/repair/new', enabled: true,
  open_mode: 'new_tab', fallback_phone: '15050166844', health_status: 'unknown',
  status: 'published', publication_state: 'published', published_at: '2026-07-30T00:00:00.000Z'
};

test('Nuxt service entry reader exposes only published and enabled CMS entries', async () => {
  let requestedUrl;
  const reader = createCmsServiceEntryReader({
    endpoint: 'https://cms.example.test/items/external_service_entries',
    now: () => Date.parse('2026-07-31T00:00:00.000Z'),
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return Response.json({ data: [publishedEntry, { ...publishedEntry, enabled: false }, { ...publishedEntry, status: 'draft' }] });
    }
  });

  assert.deepEqual(await reader.list(), { data: [publishedEntry], cache: 'fresh', source: 'cms' });
  assert.equal(requestedUrl.searchParams.get('filter[enabled][_eq]'), 'true');
  assert.equal(requestedUrl.searchParams.get('filter[status][_eq]'), 'published');
  assert.equal(requestedUrl.searchParams.has('sort'), false);
});

test('Nuxt service entry reader keeps its last CMS value but has no fabricated CMS fallback', async () => {
  let online = true;
  const reader = createCmsServiceEntryReader({
    endpoint: 'https://cms.example.test/items/external_service_entries', cacheTtlMs: 0,
    fetchImpl: async () => online ? Response.json({ data: [publishedEntry] }) : new Response('', { status: 503 })
  });

  await reader.list();
  online = false;
  assert.deepEqual(await reader.list(), { data: [publishedEntry], cache: 'stale', source: 'cms' });
  assert.deepEqual(await createCmsServiceEntryReader({ endpoint: '' }).list(), { data: [], cache: 'unavailable', source: 'static' });
});

test('Nuxt service entry reader sends a configured server-only CMS token upstream', async () => {
  let headers;
  const reader = createCmsServiceEntryReader({ endpoint: 'https://cms.example.test/items/external_service_entries', accessToken: 'server-only-token', fetchImpl: async (_url, options) => {
    headers = options.headers;
    return Response.json({ data: [] });
  } });
  await reader.list();
  assert.equal(headers.Authorization, 'Bearer server-only-token');
});
