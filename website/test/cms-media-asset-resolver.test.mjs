import assert from 'node:assert/strict';
import test from 'node:test';

const { createCmsMediaAssetResolver } = await import('../server/services/cms-media-asset-resolver.mjs');

const FILE_7 = '11111111-1111-4111-8111-111111111111';
const FILE_8 = '22222222-2222-4222-8222-222222222222';

test('CMS media asset resolver maps only published asset metadata to the site-managed asset path', async () => {
  let request;
  const resolver = createCmsMediaAssetResolver({
    endpoint: 'https://cms.example.test/items/media_assets', accessToken: 'server-only-token',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url, options) => {
      request = { url: new URL(url), headers: options.headers };
      return Response.json({ data: [
        { id: 7, file_id: FILE_7, alt_text: '已审核机床', status: 'published', publication_state: 'published', published_at: '2026-07-31T00:00:00.000Z' },
        { id: 8, file_id: FILE_8, alt_text: '草稿', status: 'draft', publication_state: 'unpublished' }
      ] });
    }
  });

  const assets = await resolver.resolve([7, '8', 'invalid']);
  assert.deepEqual(assets.get('7'), {
    // A site-relative path, not a Directus URL: the public Directus policy has no
    // read permission on directus_files, so a Directus-origin URL 403s and the
    // browser refuses the cross-origin media load (ERR_BLOCKED_BY_ORB).
    path: `/api/public/v1/media/asset/${FILE_7}`, managed: true, alt: '已审核机床', mediaType: 'image', posterPath: null,
    title: '', description: '', durationSeconds: null, width: null, height: null,
    autoplay: false, muted: true, loop: false, published_at: '2026-07-31T00:00:00.000Z'
  });
  assert.equal(assets.has('8'), false);
  assert.equal(request.url.searchParams.get('filter[id][_in]'), '7,8');
  assert.equal(request.url.searchParams.get('filter[status][_eq]'), 'published');
  assert.equal(request.headers.Authorization, 'Bearer server-only-token');
});

test('CMS media asset resolver drops assets whose file id is not a file UUID', async () => {
  const resolver = createCmsMediaAssetResolver({
    endpoint: 'https://cms.example.test/items/media_assets',
    fetchImpl: async () => Response.json({ data: [
      { id: 1, file_id: '../../etc/passwd', status: 'published', publication_state: 'published' },
      { id: 2, file_id: 'not-a-uuid', status: 'published', publication_state: 'published' },
      { id: 3, file_id: FILE_7, status: 'published', publication_state: 'published' }
    ] })
  });

  const assets = await resolver.resolve([1, 2, 3]);
  assert.equal(assets.has('1'), false);
  assert.equal(assets.has('2'), false);
  assert.equal(assets.get('3')?.path, `/api/public/v1/media/asset/${FILE_7}`);
});

test('CMS media asset resolver fails closed without an endpoint', async () => {
  assert.deepEqual(await createCmsMediaAssetResolver({}).resolve([1]), new Map());
});
