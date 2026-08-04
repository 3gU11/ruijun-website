import assert from 'node:assert/strict';
import test from 'node:test';

const { createCmsServiceContentReader } = await import('../server/services/cms-service-content-reader.mjs');

const publishedResource = {
  source_key: 'manual-fr-xs', type: 'manual', applicable_models: ['FR400XS'], version: 'v1', language: 'zh-CN',
  asset: 'https://assets.example.test/manual-fr-xs.pdf', updated_at: '2026-07-30T00:00:00.000Z',
  status: 'published', publication_state: 'published', published_at: '2026-07-30T00:00:00.000Z'
};
const activeLocation = {
  source_key: 'east-china', region: '华东', city: '苏州', service_scope: '上门服务', contact: { phone: '15050166844' }, business_status: 'active',
  status: 'published', publication_state: 'published', published_at: '2026-07-30T00:00:00.000Z'
};

test('Nuxt service content reader exposes only published resources and active service locations', async () => {
  const requests = [];
  const reader = createCmsServiceContentReader({
    resourcesEndpoint: 'https://cms.example.test/items/service_resources', locationsEndpoint: 'https://cms.example.test/items/service_locations',
    accessToken: 'server-only-token', now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url, options) => {
      const request = new URL(url);
      requests.push({ request, headers: options.headers });
      return Response.json({ data: request.pathname.endsWith('service_resources')
        ? [publishedResource, { ...publishedResource, source_key: 'draft-resource', status: 'draft' }, { ...publishedResource, source_key: 'future-resource', published_at: '2026-08-02T00:00:00.000Z' }]
        : [activeLocation, { ...activeLocation, source_key: 'closed-location', business_status: 'closed' }, { ...activeLocation, source_key: 'draft-location', status: 'draft' }] });
    }
  });

  assert.deepEqual(await reader.listResources(), { data: [publishedResource], cache: 'fresh', source: 'cms' });
  assert.deepEqual(await reader.listLocations(), { data: [activeLocation], cache: 'fresh', source: 'cms' });
  assert.equal(requests[0].request.searchParams.get('filter[status][_eq]'), 'published');
  assert.equal(requests[1].request.searchParams.get('filter[business_status][_eq]'), 'active');
  assert.equal(requests[0].headers.Authorization, 'Bearer server-only-token');
});

test('Nuxt service content reader fails closed and preserves only its own last valid values during CMS outages', async () => {
  assert.deepEqual(await createCmsServiceContentReader({ resourcesEndpoint: '', locationsEndpoint: '' }).listResources(), { data: [], cache: 'unavailable', source: 'static' });

  let available = true;
  const reader = createCmsServiceContentReader({
    resourcesEndpoint: 'https://cms.example.test/items/service_resources', locationsEndpoint: '', cacheTtlMs: 0,
    fetchImpl: async () => available ? Response.json({ data: [publishedResource] }) : new Response('', { status: 503 })
  });
  await reader.listResources();
  available = false;
  assert.deepEqual(await reader.listResources(), { data: [publishedResource], cache: 'stale', source: 'cms' });
  assert.deepEqual(await reader.listLocations(), { data: [], cache: 'unavailable', source: 'static' });
});
