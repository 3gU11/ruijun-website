import assert from 'node:assert/strict';
import test from 'node:test';

import { productModelLivePreviewRecord } from '../extensions/content-editor-workbench/src/product-model-live-preview.js';

test('product model live preview preserves model parameters and exposes editable rows as groups', () => {
  const result = productModelLivePreviewRecord({
    id: 15,
    model_code: 'fl1180',
    parameters: { xyTravelMm: '1100*800', zAxisTravelMm: 500 }
  }, [
    { id: 2, model_code: 'fl1180', group_name: '运动参数', field_name: 'Z 轴行程', value: '500', unit: 'mm', sort_order: 2 },
    { id: 1, model_code: 'fl1180', group_name: '运动参数', field_name: 'XY 行程', value: '1100*800', unit: 'mm', sort_order: 1 },
    { id: 3, model_code: 'other', group_name: '错误', field_name: '错误', value: '错误', sort_order: 1 }
  ]);

  assert.deepEqual(result.parameters, { xyTravelMm: '1100*800', zAxisTravelMm: 500 });
  assert.deepEqual(result.parameter_groups, [{
    name: '运动参数',
    groupBinding: {
      collection: 'product_parameters',
      itemId: '1',
      recordIds: ['1', '2']
    },
    items: [
      { id: '1', label: 'XY 行程', value: '1100*800', unit: 'mm' },
      { id: '2', label: 'Z 轴行程', value: '500', unit: 'mm' }
    ]
  }]);
});
