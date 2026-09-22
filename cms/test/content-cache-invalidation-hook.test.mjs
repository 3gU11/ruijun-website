import assert from 'node:assert/strict';
import test from 'node:test';
import { cacheInvalidationCollections, registerContentCacheInvalidationHook } from '../extensions/content-cache-invalidation-hook/src/index.js';

test('content cache hook registers create, update and delete actions for every public collection', async () => {
  const actions = new Map();
  registerContentCacheInvalidationHook({
    action: (event, handler) => actions.set(event, handler),
    env: { WEBSITE_CACHE_INVALIDATION_URL: 'http://127.0.0.1:4175/api/internal/v1/cms/cache-invalidate', CMS_WEBHOOK_SECRET: 'a'.repeat(64) },
    fetchImpl: async (url, init) => {
      assert.equal(url, 'http://127.0.0.1:4175/api/internal/v1/cms/cache-invalidate');
      assert.equal(init.method, 'POST');
      assert.equal(init.headers.Authorization, `Bearer ${'a'.repeat(64)}`);
      assert.deepEqual(JSON.parse(init.body), { collection: 'articles', keys: ['article-1'] });
      return new Response('{}', { status: 200 });
    }
  });
  assert.equal(actions.size, cacheInvalidationCollections.length * 3);
  assert.deepEqual(await actions.get('articles.items.update')({ keys: ['article-1'] }), { status: 'succeeded', attempted: true, error: null });
});

test('content cache hook does not block a content mutation when the website cache is unavailable', async () => {
  const actions = new Map();
  const warnings = [];
  registerContentCacheInvalidationHook({ action: (event, handler) => actions.set(event, handler), env: { WEBSITE_CACHE_INVALIDATION_URL: 'http://127.0.0.1:4175/api/internal/v1/cms/cache-invalidate', CMS_WEBHOOK_SECRET: 'b'.repeat(64) }, fetchImpl: async () => new Response('down', { status: 503 }), logger: { warn: (message) => warnings.push(message) } });
  const outcome = await actions.get('pages.items.update')({ keys: ['page-1'] });
  assert.equal(outcome.status, 'failed');
  assert.equal(warnings.length, 1);
});

test('content cache hook registers a pre-mutation filter so public reads cannot race an action refresh', async () => {
  const filters = new Map();
  const calls = [];
  registerContentCacheInvalidationHook({
    action: () => {},
    filter: (event, handler) => filters.set(event, handler),
    env: { WEBSITE_CACHE_INVALIDATION_URL: 'http://127.0.0.1:4175/api/internal/v1/cms/cache-invalidate', CMS_WEBHOOK_SECRET: 'c'.repeat(64) },
    fetchImpl: async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return new Response('{}', { status: 200 });
    }
  });
  assert.equal(filters.size, cacheInvalidationCollections.length * 3);
  const payload = { title: 'next' };
  assert.deepEqual(await filters.get('articles.items.update')(payload, { keys: ['article-7'] }), payload);
  assert.deepEqual(calls.at(-1).body, { collection: 'articles', keys: ['article-7'] });
});
