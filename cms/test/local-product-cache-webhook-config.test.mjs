import assert from 'node:assert/strict';
import test from 'node:test';

import { buildLocalProductCacheWebhookConfiguration } from '../scripts/configure-local-product-cache-webhook.mjs';

test('local product cache webhook configuration writes one shared secret without returning it as metadata', () => {
  const secret = 'a'.repeat(64);
  const result = buildLocalProductCacheWebhookConfiguration({
    cmsSource: 'CMS_BASE_URL=http://127.0.0.1:8055\r\n',
    websiteSource: 'CMS_PAGES_URL=http://127.0.0.1:8055/items/pages\r\n',
    endpoint: 'http://127.0.0.1:4173/api/internal/v1/cms/cache-invalidate',
    secret
  });

  assert.match(result.cmsSource, /^WEBSITE_CACHE_INVALIDATION_URL=http:\/\/127\.0\.0\.1:4173\/api\/internal\/v1\/cms\/cache-invalidate$/m);
  assert.match(result.cmsSource, new RegExp(`^CMS_WEBHOOK_SECRET=${secret}$`, 'm'));
  assert.match(result.websiteSource, new RegExp(`^CMS_WEBHOOK_SECRET=${secret}$`, 'm'));
  assert.match(result.cmsSource, /^PRODUCT_RELEASE_CACHE_INVALIDATION_TIMEOUT_MS=5000$/m);
  assert.deepEqual(Object.keys(result).sort(), ['cmsSource', 'websiteSource']);
});

test('local product cache webhook configuration refuses secret drift and public endpoints', () => {
  assert.throws(() => buildLocalProductCacheWebhookConfiguration({
    cmsSource: `CMS_WEBHOOK_SECRET=${'a'.repeat(64)}\n`,
    websiteSource: `CMS_WEBHOOK_SECRET=${'b'.repeat(64)}\n`
  }), /do not match/);
  assert.throws(() => buildLocalProductCacheWebhookConfiguration({
    cmsSource: '', websiteSource: '', endpoint: 'https://public.example.com/api/internal/v1/cms/cache-invalidate', secret: 'a'.repeat(64)
  }), /loopback or RFC1918/);
});
