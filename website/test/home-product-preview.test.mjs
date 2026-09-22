import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { resolveHomepageProducts } from '../shared/home-product-catalog.mjs';

const fallback = [
  { id: 'fallback-1', name: '默认产品', series: '默认系列', image: '/assets/default.png' }
];

test('homepage product cards use product-series preview records when public data is empty', () => {
  const preview = [{
    id: 42,
    slug: 'preview-series',
    name: '预览产品系列',
    positioning: '预览定位',
    cover_asset: '/api/preview/media/42'
  }];

  const products = resolveHomepageProducts([], preview, fallback);

  assert.equal(products.length, 1);
  assert.equal(products[0].name, '预览产品系列');
  assert.equal(products[0].series, '预览定位');
  assert.equal(products[0].image, '/api/preview/media/42');
  assert.deepEqual(products[0].cmsBinding, { collection: 'product_series', itemId: '42' });
});

test('homepage product cards overlay preview records over published records and only fallback when both are empty', () => {
  const published = [{ id: 1, slug: 'published', name: '已发布', positioning: '旧定位', cover_asset: '/assets/published.png' }];
  const preview = [{ id: 1, slug: 'published', name: '草稿名称', positioning: '新定位', cover_asset: '/api/preview/media/99' }];

  const products = resolveHomepageProducts(published, preview, fallback);

  assert.equal(products.length, 1);
  assert.equal(products[0].name, '草稿名称');
  assert.equal(products[0].series, '新定位');
  assert.equal(products[0].image, '/api/preview/media/99');

  const fallbackProducts = resolveHomepageProducts([], [], fallback);
  assert.deepEqual(fallbackProducts[0].cmsBinding, { collection: '', itemId: '' });
});

test('a real product series keeps an editable cover slot while showing its fallback image', () => {
  const matchingFallbacks = [
    { id: 'workstation', image: '/assets/workstation.png' },
    { id: 'ft-xs', image: '/assets/ft-xs.png' }
  ];
  const products = resolveHomepageProducts([], [{ id: 7, slug: 'ft-xs', name: 'FT-XS', cover_asset: null }], matchingFallbacks);

  assert.equal(products[0].image, '/assets/ft-xs.png');
  assert.equal(products[0].imageFieldPath, 'cover_asset');
  assert.deepEqual(products[0].cmsBinding, { collection: 'product_series', itemId: '7' });
});

test('homepage product fallback images follow the series identity instead of record order', () => {
  const matchingFallbacks = [
    { id: 'workstation', image: '/assets/workstation.png' },
    { id: 'fr-pro', image: '/assets/fr-pro.png' },
    { id: 'ft-xs', image: '/assets/ft-xs.png' }
  ];
  const preview = [
    { id: 6, slug: 'ft-xs', series_code: 'ft-xs', cover_asset: null },
    { id: 5, slug: 'fr-pro', series_code: 'fr-pro', cover_asset: null },
    { id: 1, slug: 'workstation', series_code: 'workstation', cover_asset: null }
  ];

  const products = resolveHomepageProducts([], preview, matchingFallbacks);
  const imagesByProduct = Object.fromEntries(products.map((product) => [product.id, product.image]));

  assert.deepEqual(imagesByProduct, {
    workstation: '/assets/workstation.png',
    'fr-pro': '/assets/fr-pro.png',
    'ft-xs': '/assets/ft-xs.png'
  });
});

test('homepage product covers expose an explicit restore-default action to the CMS canvas', async () => {
  const page = await readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');
  assert.match(page, /data-cms-preview-media-role="cover"[^>]+data-cms-preview-allow-default="true"/);
  assert.match(page, /id: 'fr-pro'[^\n]+product-pro\.png/);
  assert.match(page, /id: 'fl-xs'[^\n]+product-fl-xs\.png/);
});
