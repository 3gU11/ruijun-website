import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatProductParameterValue,
  resolvePreviewProductSelection
} from '../shared/product-preview-state.mjs';

test('late product-model preview session selects the matching series and model', () => {
  const selection = resolvePreviewProductSelection({
    collection: 'product_models',
    preview: { series_code: 'fl-xs', model_code: 'fl1180' }
  }, [
    { id: 'auto' },
    { id: 'fl' }
  ], [
    { slug: 'fl', series_code: 'fl-xs' }
  ]);

  assert.deepEqual(selection, { selectedCard: 'fl', selectedModel: 'fl1180' });
});

test('draft-only product previews map legacy template family ids without public series rows', () => {
  const selection = resolvePreviewProductSelection({
    collection: 'product_models',
    preview: { series_code: 'fl-xs', model_code: 'fl1180' }
  }, [
    { id: 'auto' },
    { id: 'fl' }
  ], []);

  assert.deepEqual(selection, { selectedCard: 'fl', selectedModel: 'fl1180' });
});

test('non-product preview sessions do not overwrite the product selection', () => {
  assert.equal(resolvePreviewProductSelection({ collection: 'pages', preview: { title: '产品页' } }, [], []), null);
});

test('product parameter values never stringify objects as object Object', () => {
  assert.equal(formatProductParameterValue('1100*800'), '1100*800');
  assert.equal(formatProductParameterValue(500), '500');
  assert.equal(formatProductParameterValue({ value: 8500 }), '8500');
  assert.equal(formatProductParameterValue({ text: '15' }), '15');
  assert.equal(formatProductParameterValue({ unsupported: true }), '');
});
