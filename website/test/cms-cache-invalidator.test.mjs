import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const { CmsCacheInvalidationUnauthorized, createCmsCacheInvalidator } = await import('../server/services/cms-cache-invalidator.mjs');
const { getCmsPublicCacheClearers, registerCmsPublicCache } = await import('../server/services/cms-public-cache-registry.mjs');

test('CMS cache invalidator authenticates the private webhook and clears only affected public-content caches', () => {
  const cleared = [];
  const invalidator = createCmsCacheInvalidator({
    secret: 'test-webhook-secret',
    clearers: {
      pages: () => cleared.push('pages'),
      products: () => cleared.push('products'),
      articles: () => cleared.push('articles'),
      navigation: () => cleared.push('navigation'),
      serviceEntries: () => cleared.push('serviceEntries'),
      serviceContent: () => cleared.push('serviceContent'),
      evidence: () => cleared.push('evidence')
    }
  });

  assert.deepEqual(invalidator.invalidate({ authorization: 'Bearer test-webhook-secret', collection: 'product_models' }), { invalidated: ['products'] });
  assert.deepEqual(cleared, ['products']);
  assert.deepEqual(invalidator.invalidate({ authorization: 'Bearer test-webhook-secret', collection: 'pages' }), { invalidated: ['pages'] });
  assert.deepEqual(invalidator.invalidate({ authorization: 'Bearer test-webhook-secret', collection: 'service_resources' }), { invalidated: ['serviceContent'] });
  assert.deepEqual(invalidator.invalidate({ authorization: 'Bearer test-webhook-secret', collection: 'qualifications' }), { invalidated: ['evidence'] });
  assert.deepEqual(invalidator.invalidate({ authorization: 'Bearer test-webhook-secret', collection: 'media_assets' }), { invalidated: ['pages', 'products', 'evidence'] });
});

test('CMS cache invalidator fails closed for missing credentials or unknown collections', () => {
  const invalidator = createCmsCacheInvalidator({ secret: 'test-webhook-secret', clearers: {} });

  assert.throws(() => invalidator.invalidate({ authorization: '', collection: 'pages' }), CmsCacheInvalidationUnauthorized);
  assert.throws(() => invalidator.invalidate({ authorization: 'Bearer wrong-secret', collection: 'pages' }), CmsCacheInvalidationUnauthorized);
  assert.throws(() => invalidator.invalidate({ authorization: 'Bearer test-webhook-secret', collection: 'leads' }), TypeError);
});

test('CMS cache invalidator clears every registered public cache for an authenticated full refresh', () => {
  const cleared = [];
  const invalidator = createCmsCacheInvalidator({
    secret: 'test-webhook-secret',
    clearers: { pages: () => cleared.push('pages'), products: () => cleared.push('products'), articles: () => cleared.push('articles') }
  });

  assert.deepEqual(invalidator.invalidate({ authorization: 'Bearer test-webhook-secret' }), { invalidated: ['pages', 'products', 'articles'] });
  assert.deepEqual(cleared, ['pages', 'products', 'articles']);
});

test('public content routes register process-wide clearers that a CMS webhook can invoke', () => {
  const cleared = [];
  const unregister = registerCmsPublicCache('test-cache', () => cleared.push('test-cache'));
  const invalidator = createCmsCacheInvalidator({ secret: 'test-webhook-secret', clearers: getCmsPublicCacheClearers() });

  assert.deepEqual(invalidator.invalidate({ authorization: 'Bearer test-webhook-secret' }), { invalidated: ['test-cache'] });
  assert.deepEqual(cleared, ['test-cache']);
  unregister();
});

test('every cached public-content route registers its cache for webhook invalidation', async () => {
  const root = new URL('../', import.meta.url);
  const sources = await Promise.all([
    'server/api/public/v1/pages/[slug].get.ts',
    'server/utils/cms-product-reader.ts',
    'server/utils/cms-article-reader.ts',
    'server/api/public/v1/navigation.get.ts',
    'server/api/public/v1/service-entries.get.ts',
    'server/utils/cms-service-content-reader.ts',
    'server/utils/cms-evidence-reader.ts'
  ].map((file) => readFile(new URL(file, root), 'utf8')));

  for (const [source, name] of sources.map((source, index) => [source, ['pages', 'products', 'articles', 'navigation', 'serviceEntries', 'serviceContent', 'evidence'][index]])) {
    assert.match(source, new RegExp(`registerCmsPublicCache\\('${name}'`));
  }
});

test('Nuxt exposes cache invalidation only through a private CMS webhook route', async () => {
  const root = new URL('../', import.meta.url);
  const [config, route] = await Promise.all([
    readFile(new URL('nuxt.config.ts', root), 'utf8'),
    readFile(new URL('server/api/internal/v1/cms/cache-invalidate.post.ts', root), 'utf8')
  ]);

  assert.match(config, /cmsWebhookSecret: process\.env\.CMS_WEBHOOK_SECRET \|\| ''/);
  assert.match(route, /getHeader/);
  assert.match(route, /createCmsCacheInvalidator/);
  assert.match(route, /getCmsPublicCacheClearers/);
  assert.doesNotMatch(route, /defineEventHandler\([^\n]*public/);
});
