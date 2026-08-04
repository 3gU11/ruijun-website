import assert from 'node:assert/strict';
import test from 'node:test';

const { createCmsMediaAssetResolver } = await import('../server/services/cms-media-asset-resolver.mjs');

test('CMS media asset resolver maps only published asset metadata to a safe Directus asset URL', async () => {
  let request;
  const resolver = createCmsMediaAssetResolver({
    endpoint: 'https://cms.example.test/items/media_assets', accessToken: 'server-only-token',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url, options) => {
      request = { url: new URL(url), headers: options.headers };
      return Response.json({ data: [
        { id: 7, file_id: 'file-7', alt_text: '已审核机床', status: 'published', publication_state: 'published', published_at: '2026-07-31T00:00:00.000Z' },
        { id: 8, file_id: 'file-8', alt_text: '草稿', status: 'draft', publication_state: 'unpublished' }
      ] });
    }
  });

  const assets = await resolver.resolve([7, '8', 'invalid']);
  assert.deepEqual(assets.get('7'), { path: 'https://cms.example.test/assets/file-7', alt: '已审核机床' });
  assert.equal(assets.has('8'), false);
  assert.equal(request.url.searchParams.get('filter[id][_in]'), '7,8');
  assert.equal(request.url.searchParams.get('filter[status][_eq]'), 'published');
  assert.equal(request.headers.Authorization, 'Bearer server-only-token');
});

test('CMS media asset resolver fails closed when the endpoint or public asset origin is unsafe', async () => {
  assert.deepEqual(await createCmsMediaAssetResolver({}).resolve([1]), new Map());
  const unsafe = createCmsMediaAssetResolver({
    endpoint: 'https://cms.example.test/items/media_assets', publicAssetBaseUrl: 'javascript:alert(1)',
    fetchImpl: async () => Response.json({ data: [{ id: 1, file_id: 'file-1', status: 'published', publication_state: 'published' }] })
  });
  assert.deepEqual(await unsafe.resolve([1]), new Map());
});
