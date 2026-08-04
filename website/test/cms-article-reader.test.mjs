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
