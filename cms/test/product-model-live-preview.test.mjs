import assert from 'node:assert/strict';
import test from 'node:test';

import { productModelLivePreviewRecord } from '../extensions/content-editor-workbench/src/product-model-live-preview.js';

test('product model live preview exposes editable rows without a group name', () => {
  const result = productModelLivePreviewRecord({
    id: 15,
    model_code: 'fl1180',
    parameters: { xyTravelMm: '1100*800', zAxisTravelMm: 500 }
  }, [
    { id: 2, model_code: 'fl1180', field_name: 'Z 轴行程', value: '500', unit: 'mm', sort_order: 2 },
    { id: 1, model_code: 'fl1180', field_name: 'XY 行程', value: '1100*800', unit: 'mm', sort_order: 1 },
    { id: 3, model_code: 'other', field_name: '错误', value: '错误', sort_order: 1 }
  ]);

  assert.deepEqual(result.parameters, { xyTravelMm: '1100*800', zAxisTravelMm: 500 });
  assert.deepEqual(result.parameter_groups, [{
    name: '',
    items: [
      { id: '1', label: 'XY 行程', value: '1100*800', unit: 'mm' },
      { id: '2', label: 'Z 轴行程', value: '500', unit: 'mm' }
    ]
  }]);
});
