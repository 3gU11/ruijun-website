import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('product index uses only public product responses and keeps search client-side', async () => {
  const page = await readFile(new URL('../pages/product/index.vue', import.meta.url), 'utf8');
  assert.match(page, /\/api\/public\/v1\/product-series/);
  assert.match(page, /\/api\/public\/v1\/products/);
  assert.match(page, /filterProductModels/);
  assert.match(page, /v-model="modelQuery"/);
  assert.match(page, /product-model-results/);
  assert.doesNotMatch(page, /CMS_BFF_TOKEN|CMS_WRITE_TOKEN|\/items\/product_models/);
});
