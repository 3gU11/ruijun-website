import assert from 'node:assert/strict';
import test from 'node:test';

const { buildComparisonRows, toggleComparedModel } = await import('../shared/product-compare.mjs');

test('product comparison selection toggles a model and never retains more than three choices', () => {
  assert.deepEqual(toggleComparedModel([], 'FR400XS'), ['FR400XS']);
  assert.deepEqual(toggleComparedModel(['FR400XS'], 'FR400XS'), []);
  assert.deepEqual(toggleComparedModel(['FR400XS', 'FR500XS', 'FR600XS'], 'FR800XS'), ['FR400XS', 'FR500XS', 'FR600XS']);
  assert.deepEqual(toggleComparedModel(['FR400XS', 'FR500XS', 'FR600XS'], 'FR500XS'), ['FR400XS', 'FR600XS']);
});

test('product comparison exposes only labeled public parameter fields in a stable display order', () => {
  const labels = { xyTravelMm: 'X x Y 行程', maxCuttingHeightMm: '最大切割高度', machineWeightKg: '机床重量' };
  const rows = buildComparisonRows([
    { model_code: 'FR400XS', parameters: { xyTravelMm: '400 x 550', machineWeightKg: 1800, internalNote: 'do-not-render' } },
    { model_code: 'FR500XS', parameters: { xyTravelMm: '500 x 630', maxCuttingHeightMm: '300' } }
  ], labels);

  assert.deepEqual(rows, [
    { key: 'xyTravelMm', label: 'X x Y 行程', values: ['400 x 550', '500 x 630'] },
    { key: 'maxCuttingHeightMm', label: '最大切割高度', values: ['', '300'] },
    { key: 'machineWeightKg', label: '机床重量', values: ['1800', ''] }
  ]);
});

test('product comparison ignores malformed model entries and non-displayable parameter values', () => {
  const rows = buildComparisonRows([
    null,
    { model_code: 'FR400XS', parameters: { xyTravelMm: { source: 'untrusted' }, maxCuttingHeightMm: false } }
  ], { xyTravelMm: 'X x Y 行程', maxCuttingHeightMm: '最大切割高度' });

  assert.deepEqual(rows, []);
});
