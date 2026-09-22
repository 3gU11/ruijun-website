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
  assert.match(page, /data-proof-target/);
  assert.match(page, /const duration = 1500/);
  assert.match(page, /node\.textContent = String\(Math\.round\(target \* eased\)\)/);
  assert.match(page, /proofCopy/);
  assert.match(page, /title: '50%', body: '产品效率性能提升', value: 50, unit: '%'/);
  assert.match(page, /value: 30, unit: 'YEARS'/);
  assert.match(page, /\.proof-grid strong em \{[^}]*font-size: \.48em/);
  assert.match(page, /activeModelOptions/);
  assert.match(page, /visibleSpecificationRows/);
  assert.match(page, /const visibleSpecificationRows = computed\(\(\) => specificationRows\.value\)/);
  assert.match(page, /const drawingPageCount = computed\(\(\) => Math\.max\(1, drawingPages\.value\.length\)\)/);
  assert.match(page, /function changeDrawingPage\(offset: number\)/);
  assert.match(page, /v-if="drawingPageCount > 1" class="specification-pager"/);
  assert.match(page, /:disabled="drawingPage === 0" @click="changeDrawingPage\(-1\)"/);
  assert.match(page, /:disabled="drawingPage === drawingPageCount - 1" @click="changeDrawingPage\(1\)"/);
  assert.match(page, /多次切割精度/);
  assert.match(page, /四轴交流伺服 4axis Servo/);
  assert.match(page, /总电气功率/);
  assert.match(page, /const catalogPageCount = computed\(\(\) => Math\.max\(1, Math\.ceil\(catalogCards\.value\.length \/ catalogPageSize\.value\)\)\)/);
  assert.match(page, /selectedModel\.value = model/);
  assert.match(page, /changeCatalogPage\(-1\)/);
  assert.match(page, /changeCatalogPage\(1\)/);
  assert.match(page, /class="specification-side-label"/);
  assert.match(page, /class="specification-drawings"/);
  assert.match(page, /product-dimensions\.png/);
  assert.match(page, /自适应切割功能/);
  assert.match(page, /效率提升50%/);
  assert.match(page, /屏显手持单元/);
  assert.match(page, /v-for="\(family, pageIndex\) in visibleCatalogCards"/);
  assert.match(page, /class="product-copy"/);
  assert.match(page, /aspect-ratio: 420 \/ 259/);
});
