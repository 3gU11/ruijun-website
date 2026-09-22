import assert from 'node:assert/strict';
import test from 'node:test';

const { createCmsMediaPlacementReader } = await import('../server/services/cms-media-asset-resolver.mjs');

test('media placement reader returns only published enabled assets and resolves the poster asset', async () => {
  const requests = [];
  const reader = createCmsMediaPlacementReader({
    endpoint: 'http://127.0.0.1:8055/items/media_assets', publicAssetBaseUrl: 'http://127.0.0.1:8055', now: () => Date.parse('2026-08-19T00:00:00Z'),
    fetchImpl: async (url) => {
      requests.push(String(url));
      const parsed = new URL(url);
      if (parsed.searchParams.get('filter[id][_in]')) return new Response(JSON.stringify({ data: [{ id: 2, file_id: 'poster-file', status: 'published', publication_state: 'published' }] }), { status: 200 });
      return new Response(JSON.stringify({ data: [{ id: 1, file_id: 'video-file', poster_asset_id: 2, media_type: 'video', mime_type: 'video/mp4', title: '首页视频', width: 1920, height: 1080, enabled: true, status: 'published', publication_state: 'published', published_at: '2026-08-18T00:00:00Z' }] }), { status: 200 });
    }
  });
  const result = await reader.get('home.hero.video');
  assert.equal(result.source, 'cms');
  assert.equal(result.data[0].path, 'http://127.0.0.1:8055/assets/video-file');
  assert.equal(result.data[0].posterPath, 'http://127.0.0.1:8055/assets/poster-file');
  assert.match(requests[0], /filter%5Bplacement_key%5D%5B_eq%5D=home\.hero\.video/);
});
