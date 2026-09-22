import assert from 'node:assert/strict';
import test from 'node:test';

import { groupPreviewProductParameters, normalizePreviewParameterGroups } from '../shared/product-preview-parameters.mjs';

test('preview parameters are grouped for the selected model with exact record bindings', () => {
  const result = groupPreviewProductParameters([
    { id: 2, model_code: 'fr400xs-auto', group_name: '运动参数', field_name: 'Z 轴行程', value: '200', unit: 'mm', sort_order: 2 },
    { id: 1, model_code: 'fr400xs-auto', group_name: '运动参数', field_name: 'XY 行程', value: '400*290', unit: 'mm', sort_order: 1 },
    { id: 3, model_code: 'other', group_name: '运动参数', field_name: 'XY 行程', value: 'wrong', sort_order: 1 }
  ], 'fr400xs-auto');

  assert.deepEqual(result, [{
    name: '运动参数',
    groupBinding: { collection: 'product_parameters', itemId: '1', recordIds: ['1', '2'] },
    items: [
      { id: '1', label: 'XY 行程', value: '400*290', unit: 'mm' },
      { id: '2', label: 'Z 轴行程', value: '200', unit: 'mm' }
    ]
  }]);
});

test('parameter group names keep every grouped record in the visual-editing binding', () => {
  const result = groupPreviewProductParameters([
    { id: 9, model_code: 'fl1610', group_name: '基础参数', field_name: 'XY 行程', value: '1600*1000', sort_order: 2 },
    { id: 8, model_code: 'fl1610', group_name: '基础参数', field_name: 'Z 轴行程', value: '500', sort_order: 1 },
    { id: 10, model_code: 'fl1610', group_name: '电气参数', field_name: '额定功率', value: '5', unit: 'KVA', sort_order: 3 }
  ], 'fl1610');

  assert.deepEqual(result.map((group) => group.groupBinding), [
    { collection: 'product_parameters', itemId: '8', recordIds: ['8', '9'] },
    { collection: 'product_parameters', itemId: '10', recordIds: ['10'] }
  ]);
});

test('preview parameters reject incomplete rows and unsafe ids', () => {
  assert.deepEqual(groupPreviewProductParameters([
    { id: '../1', model_code: 'fr400xs-auto', field_name: 'XY 行程', value: '400*290' },
    { id: 2, model_code: 'fr400xs-auto', field_name: '', value: '200' },
    { id: 3, model_code: 'fr400xs-auto', field_name: 'Z 轴行程', value: '' }
  ], 'fr400xs-auto'), []);
});

test('model preview parameter groups retain their independent record IDs for visual editing', () => {
  const result = normalizePreviewParameterGroups([{
    name: '运动参数',
    items: [
      { id: 94, label: 'XY 行程', value: '1100*800', unit: 'mm' },
      { id: '../95', label: '无效参数', value: '500', unit: 'mm' }
    ]
  }]);

  assert.deepEqual(result, [{
    name: '运动参数',
    items: [{ id: '94', label: 'XY 行程', value: '1100*800', unit: 'mm' }]
  }]);
});

test('parameter preview retains only the field presentation needed by bound cells', () => {
  const result = groupPreviewProductParameters([{
    id: 94,
    model_code: 'fl1390',
    group_name: '基础参数',
    field_name: 'XY 行程',
    value: '1300*900',
    presentation: { field_presentation: { field_name: { text_style: { enabled: true, size_desktop: 20 } } } }
  }], 'fl1390');

  assert.deepEqual(result[0].items[0].presentation, {
    field_presentation: { field_name: { text_style: { enabled: true, size_desktop: 20 } } }
  });
});
