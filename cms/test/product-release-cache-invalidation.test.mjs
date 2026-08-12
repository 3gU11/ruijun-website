import assert from 'node:assert/strict';
import test from 'node:test';

import { invalidateProductReleaseCache } from '../product-release/product-release-cache-invalidation.mjs';

test('product release cache invalidation stays observable when the website webhook is not configured', async () => {
  let fetched = false;
  const result = await invalidateProductReleaseCache({
    endpoint: '', secret: '', release: { id: 12, version: 3 },
    fetchImpl: async () => { fetched = true; return new Response(); }
  });

  assert.deepEqual(result, {
    status: 'not_configured', attempted: false, error: 'CACHE_INVALIDATION_NOT_CONFIGURED'
  });
  assert.equal(fetched, false);
});

test('product release cache invalidation authenticates the private website endpoint without exposing the secret in its body', async () => {
  const requests = [];
  const result = await invalidateProductReleaseCache({
    endpoint: 'http://127.0.0.1:4173/api/internal/v1/cms/cache-invalidate',
    secret: 'cache-secret',
    release: { id: 12, version: 3, source_hash: 'hash-3' },
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return Response.json({ invalidated: ['products'] });
    }
  });

  assert.deepEqual(result, { status: 'succeeded', attempted: true, error: null });
  assert.equal(requests[0].options.headers.Authorization, 'Bearer cache-secret');
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    collection: 'product_release_snapshots', releaseId: 12, version: 3, sourceHash: 'hash-3'
  });
  assert.doesNotMatch(requests[0].options.body, /cache-secret/);
});

test('product release cache invalidation records only a bounded error code for an upstream failure', async () => {
  const result = await invalidateProductReleaseCache({
    endpoint: 'https://www.example.com/api/internal/v1/cms/cache-invalidate',
    secret: 'cache-secret',
    release: { id: 12, version: 3 },
    fetchImpl: async () => new Response('private upstream diagnostic', { status: 503 })
  });

  assert.deepEqual(result, { status: 'failed', attempted: true, error: 'CACHE_INVALIDATION_HTTP_503' });
  assert.doesNotMatch(JSON.stringify(result), /private upstream diagnostic|cache-secret/);
});

test('product release cache invalidation fails closed for an unsafe endpoint configuration', async () => {
  const result = await invalidateProductReleaseCache({
    endpoint: 'file:///tmp/cache', secret: 'cache-secret', release: { id: 12, version: 3 }
  });

  assert.deepEqual(result, {
    status: 'failed', attempted: false, error: 'CACHE_INVALIDATION_CONFIGURATION_INVALID'
  });
});
