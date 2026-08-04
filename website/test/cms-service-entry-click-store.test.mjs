import assert from 'node:assert/strict';
import test from 'node:test';

const { CmsServiceEntryClickStoreUnavailable, createCmsServiceEntryClickStore } = await import('../server/services/cms-service-entry-click-store.mjs');

test('service entry click store writes only the anonymous entry type and source page', async () => {
  let request;
  const store = createCmsServiceEntryClickStore({
    endpoint: 'https://cms.example.test/items/service_entry_clicks', accessToken: 'server-only-token',
    fetchImpl: async (url, options) => { request = { url, options }; return new Response(null, { status: 204 }); }
  });

  assert.deepEqual(await store.create({ entryType: 'request', sourcePath: '/service', phone: '15050166844' }), { stored: true });
  assert.equal(request.options.headers.Authorization, 'Bearer server-only-token');
  assert.deepEqual(JSON.parse(request.options.body), { entry_type: 'request', source_page: '/service' });
});

test('service entry click store fails closed when its private CMS write is unavailable', async () => {
  const store = createCmsServiceEntryClickStore({
    endpoint: 'https://cms.example.test/items/service_entry_clicks', accessToken: 'server-only-token',
    fetchImpl: async () => new Response('', { status: 503 })
  });
  await assert.rejects(() => store.create({ entryType: 'request', sourcePath: '/service' }), CmsServiceEntryClickStoreUnavailable);
});
