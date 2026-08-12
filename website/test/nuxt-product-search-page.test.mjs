import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('product index uses only public product responses and keeps search client-side', async () => {
  const page = await Promise.all([
    readFile(new URL('../pages/product/index.vue', import.meta.url), 'utf8'),
    readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8')
  ]).then(([index, detail]) => `${index}\n${detail}`);
  assert.match(page, /\/api\/public\/v1\/product-series/);
  assert.match(page, /\/api\/public\/v1\/products/);
  assert.match(page, /filterProductModels/);
  assert.match(page, /v-model="modelQuery"/);
  assert.match(page, /product-model-results/);
  assert.doesNotMatch(page, /CMS_BFF_TOKEN|CMS_WRITE_TOKEN|\/items\/product_models/);
});

test('product detail proof metrics enter from a rotated lower-right origin', async () => {
  const page = await readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8');

  assert.match(page, /transform:translate3d\(0,38px,0\) rotate\(-8deg\);transform-origin:100% 100%/);
  assert.match(page, /transform:translate3d\(0,0,0\) rotate\(0\)/);
  assert.match(page, /transform \.96s cubic-bezier\(\.22,\.8,\.24,1\)/);
  assert.match(page, /child\.nodeType === Node\.TEXT_NODE/);
  assert.match(page, /const durations = \[1500, 1500, 3000\]/);
  assert.match(page, /proofNodes\[2\]\?\.replaceChildren\(document\.createTextNode\('NO\.0'\)\)/);
  assert.match(page, /<em>YEARS<\/em>/);
  assert.match(page, /seriesModelOptions/);
  assert.match(page, /visibleSpecificationRows/);
  assert.match(page, /const visibleSpecificationRows = computed\(\(\) => specificationRows\.value\)/);
  assert.match(page, /多次切割精度/);
  assert.match(page, /四轴交流伺服 4axis Servo/);
  assert.match(page, /总电气功率/);
  assert.match(page, /const parameterPageCount = computed\(\(\) => activeModelOptions\.value\.length\)/);
  assert.match(page, /selectedModel\.value = activeModelOptions\.value\[parameterPage\.value\]/);
  assert.match(page, /changeParameterPage\(-1\)/);
  assert.match(page, /changeParameterPage\(1\)/);
  assert.match(page, /class="specification-side-label"/);
  assert.match(page, /class="specification-drawings"/);
  assert.match(page, /product-dimensions\.png/);
  assert.match(page, /自适应切割功能/);
  assert.match(page, /效率提升50%/);
  assert.match(page, /屏显手持单元/);
  assert.match(page, /v-for="family in productCards"/);
  assert.match(page, /class="product-copy"/);
  assert.match(page, /aspect-ratio: 420 \/ 259/);
});
