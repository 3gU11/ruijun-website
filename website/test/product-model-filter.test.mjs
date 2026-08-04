import assert from 'node:assert/strict';
import test from 'node:test';

const { filterProductModels, normalizeProductSearch } = await import('../shared/product-model-filter.mjs');

const models = [
  { series_code: 'fr-xs', model_code: 'FR400XS', name: 'FR400XS 高精度中走丝' },
  { series_code: 'fr-xs', model_code: 'FR500XS', name: 'FR500XS 自动穿丝' },
  { series_code: 'ft', model_code: 'FT500', name: 'FT500 大锥度设备' },
  { series_code: 'draft', name: '缺少型号编码' },
  null
];

test('product model search normalizes query text and filters only displayable public-response records', () => {
  assert.equal(normalizeProductSearch(' fr-400 xs '), 'FR400XS');
  assert.deepEqual(filterProductModels(models, ''), models.slice(0, 3));
  assert.deepEqual(filterProductModels(models, '400 xs'), [models[0]]);
  assert.deepEqual(filterProductModels(models, '自动穿丝'), [models[1]]);
  assert.deepEqual(filterProductModels(models, 'fr xs'), [models[0], models[1]]);
  assert.deepEqual(filterProductModels(models, '不存在'), []);
});
