import assert from 'node:assert/strict';
import test from 'node:test';

const { createCmsArticleReader } = await import('../server/services/cms-article-reader.mjs');

test('Nuxt CMS article reader exposes only currently published articles in descending publication order', async () => {
  let request;
  const now = Date.parse('2026-08-01T00:00:00.000Z');
  const published = { slug: 'trade-show-2026', title: '展会新闻', category: 'event', published_at: '2026-07-30T00:00:00.000Z', status: 'published', publication_state: 'published' };
  const reader = createCmsArticleReader({
    endpoint: 'https://cms.example.test/items/articles', accessToken: 'server-only-token', now: () => now,
    fetchImpl: async (url, options) => {
      request = { url: new URL(url), headers: options.headers };
      return Response.json({ data: [
        { ...published, slug: 'older-news', published_at: '2026-07-15T00:00:00.000Z' }, published,
        { ...published, slug: 'draft-news', status: 'draft' },
        { ...published, slug: 'scheduled-news', published_at: '2026-08-02T00:00:00.000Z' }
      ] });
    }
  });

  assert.deepEqual(await reader.list(), { data: [published, { ...published, slug: 'older-news', published_at: '2026-07-15T00:00:00.000Z' }], cache: 'fresh', source: 'cms' });
  assert.equal(request.url.searchParams.get('filter[status][_eq]'), 'published');
  assert.equal(request.url.searchParams.get('filter[publication_state][_eq]'), 'published');
  assert.equal(request.headers.Authorization, 'Bearer server-only-token');
});

test('article display date controls public ordering while publication time remains the publication gate', async () => {
  let request;
  const reader = createCmsArticleReader({
    endpoint: 'https://cms.example.test/items/articles',
    now: () => Date.parse('2026-08-10T00:00:00.000Z'),
    fetchImpl: async (url) => {
      request = new URL(url);
      return Response.json({ data: [
        { id: 4, slug: 'same-day-later', title: '同日后排', display_date: '2026-08-08', sort_order: 2, published_at: '2026-08-02T00:00:00.000Z', status: 'published', publication_state: 'published' },
        { id: 11, slug: 'same-day-first', title: '同日先排', display_date: '2026-08-08', sort_order: 0, published_at: '2026-08-02T00:00:00.000Z', status: 'published', publication_state: 'published' },
        { id: 3, slug: 'older-display', title: '旧显示日期', display_date: '2026-08-01', published_at: '2026-08-09T00:00:00.000Z', status: 'published', publication_state: 'published' }
      ] });
    }
  });
  assert.deepEqual((await reader.list()).data.map((article) => [article.slug, article.display_date]), [
    ['same-day-first', '2026-08-08'], ['same-day-later', '2026-08-08'], ['older-display', '2026-08-01']
  ]);
  assert.match(request.searchParams.get('fields'), /(^|,)sort_order(,|$)/);
  assert.equal(request.searchParams.get('sort'), '-display_date,sort_order,-id');
});

test('Nuxt CMS article reader fails closed without an endpoint and keeps its last valid response during an outage', async () => {
  const unavailable = createCmsArticleReader({ endpoint: '' });
  assert.deepEqual(await unavailable.list(), { data: [], cache: 'unavailable', source: 'static' });

  let available = true;
  const reader = createCmsArticleReader({
    endpoint: 'https://cms.example.test/items/articles',
    fetchImpl: async () => available ? Response.json({ data: [{ slug: 'news', title: '新闻', status: 'published', publication_state: 'published' }] }) : Response.json({}, { status: 503 }),
    cacheTtlMs: 0
  });
  assert.equal((await reader.list()).data.length, 1);
  available = false;
  assert.deepEqual(await reader.list(), { data: [{ slug: 'news', title: '新闻', status: 'published', publication_state: 'published' }], cache: 'stale', source: 'cms' });
});

test('Nuxt CMS article reader retries an incomplete paginated snapshot before caching it', async () => {
  const records = [
    { id: 1, slug: 'news-1', title: '新闻 1', display_date: '2026-08-03', status: 'published', publication_state: 'published' },
    { id: 2, slug: 'news-2', title: '新闻 2', display_date: '2026-08-02', status: 'published', publication_state: 'published' },
    { id: 3, slug: 'news-3', title: '新闻 3', display_date: '2026-08-01', status: 'published', publication_state: 'published' }
  ];
  let requestCount = 0;
  const reader = createCmsArticleReader({
    endpoint: 'https://cms.example.test/items/articles', cacheTtlMs: 0, incompleteRetryDelayMs: 0,
    fetchImpl: async (url) => {
      requestCount += 1;
      const offset = Number(new URL(url).searchParams.get('offset') || 0);
      if (requestCount <= 2) {
        return offset === 0
          ? Response.json({ data: records.slice(0, 2), meta: { filter_count: 3 } })
          : Response.json({ data: [], meta: { filter_count: 3 } });
      }
      return Response.json({ data: records, meta: { filter_count: 3 } });
    }
  });

  const result = await reader.list();
  assert.deepEqual(result.data.map((article) => article.slug), ['news-1', 'news-2', 'news-3']);
  assert.equal(result.cache, 'fresh');
  assert.ok(requestCount >= 3, `expected a retry after the incomplete snapshot, got ${requestCount} requests`);
});

test('Nuxt CMS article reader evaluates publication time after the CMS response arrives', async () => {
  let clockReads = 0;
  const reader = createCmsArticleReader({
    endpoint: 'https://cms.example.test/items/articles',
    cacheTtlMs: 0,
    now: () => (clockReads += 1) === 1 ? 1_000 : 1_001,
    fetchImpl: async () => Response.json({ data: [{
      id: 1, slug: 'just-published', title: '刚发布的新闻',
      status: 'published', publication_state: 'published', published_at: '1970-01-01T00:00:01.001Z'
    }] })
  });

  assert.deepEqual((await reader.list()).data.map((article) => article.slug), ['just-published']);
  assert.ok(clockReads >= 2, 'publication gate should be evaluated after the response is read');
});

test('Nuxt CMS article reader tolerates Directus second-precision publication timestamps but keeps future schedules hidden', async () => {
  const reader = createCmsArticleReader({
    endpoint: 'https://cms.example.test/items/articles',
    now: () => Date.parse('2026-08-01T00:00:00.250Z'),
    fetchImpl: async () => Response.json({ data: [
      { slug: 'same-second', status: 'published', publication_state: 'published', published_at: '2026-08-01T00:00:01.000Z' },
      { slug: 'far-future', status: 'published', publication_state: 'published', published_at: '2026-08-01T00:01:00.000Z' }
    ] })
  });

  assert.deepEqual((await reader.list()).data.map((article) => article.slug), ['same-second']);
});

test('Nuxt CMS article reader returns only a currently published detail by a valid slug', async () => {
  let request;
  const article = { slug: 'trade-show-2026', title: '展会新闻', body: '已审核正文', status: 'published', publication_state: 'published', published_at: '2026-07-30T00:00:00.000Z' };
  const reader = createCmsArticleReader({
    endpoint: 'https://cms.example.test/items/articles', accessToken: 'server-only-token', now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url, options) => {
      request = { url: new URL(url), headers: options.headers };
      return Response.json({ data: [article, { ...article, slug: 'draft-news', status: 'draft' }] });
    }
  });

  assert.deepEqual(await reader.get('trade-show-2026'), { data: article, cache: 'fresh', source: 'cms' });
  assert.equal(request.url.searchParams.get('filter[slug][_eq]'), 'trade-show-2026');
  assert.equal(request.url.searchParams.get('filter[status][_eq]'), 'published');
  assert.match(request.url.searchParams.get('fields'), /body/);
  assert.match(request.url.searchParams.get('fields'), /(^|,)id(,|$)/);
  assert.equal(request.headers.Authorization, 'Bearer server-only-token');
  await assert.rejects(() => reader.get('../private'), /Invalid article slug/);
});

test('Nuxt CMS article detail does not expose stale or draft data when no valid detail is cached', async () => {
  const reader = createCmsArticleReader({
    endpoint: 'https://cms.example.test/items/articles',
    fetchImpl: async () => Response.json({ data: [{ slug: 'draft-news', status: 'draft', publication_state: 'unpublished' }] })
  });

  assert.deepEqual(await reader.get('draft-news'), { data: null, cache: 'fresh', source: 'cms' });
});

test('Nuxt CMS article reader resolves only published cover media and never exposes a bare media id', async () => {
  const requests = [];
  const article = { slug: 'media-news', title: 'Media news', status: 'published', publication_state: 'published', cover_asset: 17 };
  const reader = createCmsArticleReader({
    endpoint: 'https://cms.example.test/items/articles',
    mediaAssetsEndpoint: 'https://cms.example.test/items/media_assets',
    publicAssetBaseUrl: 'https://cdn.example.test',
    fetchImpl: async (url) => {
      const request = new URL(url);
      requests.push(request);
      if (request.pathname.endsWith('/media_assets')) {
        return Response.json({ data: [{ id: 17, file_id: 'approved-cover', alt_text: 'Approved cover', status: 'published', publication_state: 'published' }, { id: 18, file_id: 'draft-cover', status: 'draft', publication_state: 'unpublished' }] });
      }
      return Response.json({ data: [article] });
    }
  });

  const result = await reader.get('media-news');
  assert.equal(result.data.cover_asset, 'https://cdn.example.test/assets/approved-cover');
  assert.equal(requests.some((request) => request.pathname.endsWith('/media_assets') && request.searchParams.get('filter[status][_eq]') === 'published'), true);

  const unresolved = createCmsArticleReader({
    endpoint: 'https://cms.example.test/items/articles', mediaAssetsEndpoint: 'https://cms.example.test/items/media_assets',
    publicAssetBaseUrl: 'https://cdn.example.test', fetchImpl: async (url) => new URL(url).pathname.endsWith('/media_assets')
      ? Response.json({ data: [] }) : Response.json({ data: [article] })
  });
  assert.equal((await unresolved.get('media-news')).data.cover_asset, null);
});

test('Nuxt CMS article reader resolves controlled article media and keeps only safe legacy URLs', async () => {
  const article = {
    slug: 'video-news', title: '视频新闻', status: 'published', publication_state: 'published', transcript: '字幕内容',
    media: [{ media_asset_id: 17, alt: '现场视频' }, { path: '/assets/legacy-image.jpg', alt: '旧图片' }, { url: 'http://unsafe.example.test/video.mp4' }]
  };
  const reader = createCmsArticleReader({
    endpoint: 'https://cms.example.test/items/articles', mediaAssetsEndpoint: 'https://cms.example.test/items/media_assets', publicAssetBaseUrl: 'https://cdn.example.test',
    fetchImpl: async (url) => new URL(url).pathname.endsWith('/media_assets')
      ? Response.json({ data: [{ id: 17, file_id: 'approved-video', media_type: 'video', poster_asset_id: null, status: 'published', publication_state: 'published' }] })
      : Response.json({ data: [article] })
  });

  const result = await reader.get('video-news');
  assert.equal(result.data.transcript, '字幕内容');
  assert.deepEqual(result.data.media, [
    { path: 'https://cdn.example.test/assets/approved-video', alt: '现场视频', mediaType: 'video', posterPath: null, title: '', description: '' },
    { path: '/assets/legacy-image.jpg', alt: '旧图片' }
  ]);
});
