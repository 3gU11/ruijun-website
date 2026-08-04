import assert from 'node:assert/strict';
import test from 'node:test';

const { createCmsPageReader } = await import('../server/services/cms-page-reader.mjs');

const publishedPage = {
  slug: 'home', title: '瑞钧智科', language: 'zh-CN', sections: [],
  status: 'published', publication_state: 'published', published_at: '2026-07-31T00:00:00.000Z'
};

test('Nuxt CMS page reader exposes only the requested published page', async () => {
  let requestedUrl;
  const reader = createCmsPageReader({
    endpoint: 'https://cms.example.test/items/pages', now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return Response.json({ data: [publishedPage, { ...publishedPage, status: 'draft' }, { ...publishedPage, slug: 'about' }] });
    }
  });

  assert.deepEqual(await reader.get('home'), { data: publishedPage, cache: 'fresh', source: 'cms' });
  assert.equal(requestedUrl.searchParams.get('filter[slug][_eq]'), 'home');
  assert.equal(requestedUrl.searchParams.get('filter[status][_eq]'), 'published');
  assert.equal(requestedUrl.searchParams.get('filter[publication_state][_eq]'), 'published');
});

test('Nuxt CMS page reader excludes individual sections still marked for claim review', async () => {
  const publicSection = { id: 'why-ruijun', title: '可公开的制造说明', body: '已完成审核。' };
  const reader = createCmsPageReader({
    endpoint: 'https://cms.example.test/items/pages', now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async () => Response.json({ data: [{
      ...publishedPage,
      sections: [publicSection, { id: 'industry-leadership', title: '待核实宣传数字', requires_claim_review: true }]
    }] })
  });

  assert.deepEqual(await reader.get('home'), {
    data: { ...publishedPage, sections: [publicSection] }, cache: 'fresh', source: 'cms'
  });
});

test('Nuxt CMS page reader resolves only published media assets referenced by page sections', async () => {
  const reader = createCmsPageReader({
    endpoint: 'https://cms.example.test/items/pages',
    mediaAssetsEndpoint: 'https://cms.example.test/items/media_assets',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url) => {
      const request = new URL(url);
      if (request.pathname.endsWith('/media_assets')) {
        return Response.json({ data: [
          { id: 7, file_id: 'published-machine', alt_text: '已审核机床图片', status: 'published', publication_state: 'published', published_at: '2026-07-31T00:00:00.000Z' },
          { id: 8, file_id: 'draft-machine', alt_text: '草稿图片', status: 'draft', publication_state: 'unpublished' }
        ] });
      }
      return Response.json({ data: [{
        ...publishedPage,
        sections: [{
          id: 'hero', title: '已审核标题', internal_note: 'never public',
          media: [{ media_asset_id: 7 }, { media_asset_id: 8 }, { path: 'https://unapproved.example.test/image.jpg' }]
        }]
      }] });
    }
  });

  assert.deepEqual(await reader.get('home'), {
    data: {
      ...publishedPage,
      sections: [{ id: 'hero', title: '已审核标题', media: [{ path: 'https://cms.example.test/assets/published-machine', alt: '已审核机床图片' }] }]
    },
    cache: 'fresh',
    source: 'cms'
  });
});

test('Nuxt CMS page reader preserves the latest page cache and otherwise returns static fallback', async () => {
  let online = true;
  const reader = createCmsPageReader({
    endpoint: 'https://cms.example.test/items/pages', cacheTtlMs: 0,
    fetchImpl: async () => online ? Response.json({ data: [publishedPage] }) : new Response('', { status: 503 })
  });

  await reader.get('home');
  online = false;
  assert.deepEqual(await reader.get('home'), { data: publishedPage, cache: 'stale', source: 'cms' });
  const noCacheReader = createCmsPageReader({ endpoint: 'https://cms.example.test/items/pages', fetchImpl: async () => new Response('', { status: 503 }) });
  assert.deepEqual(await noCacheReader.get('about'), { data: null, cache: 'unavailable', source: 'static' });
});

test('Nuxt CMS page reader rejects unsafe page slugs before contacting the CMS', async () => {
  const reader = createCmsPageReader({ endpoint: 'https://cms.example.test/items/pages', fetchImpl: async () => { throw new Error('not reached'); } });
  await assert.rejects(reader.get('../users'), /page slug/i);
});

test('Nuxt CMS page reader sends a configured server-only CMS token upstream', async () => {
  let headers;
  const reader = createCmsPageReader({ endpoint: 'https://cms.example.test/items/pages', accessToken: 'server-only-token', fetchImpl: async (_url, options) => {
    headers = options.headers;
    return Response.json({ data: [] });
  } });
  await reader.get('home');
  assert.equal(headers.Authorization, 'Bearer server-only-token');
});
