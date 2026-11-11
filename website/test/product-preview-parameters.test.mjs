import assert from 'node:assert/strict';
import test from 'node:test';

import { groupPreviewProductParameters, mergePreviewParameterRows, normalizePreviewParameterGroups } from '../shared/product-preview-parameters.mjs';

test('preview parameters expose the selected model as one flat row set with exact record ids', () => {
  const result = groupPreviewProductParameters([
    { id: 2, model_code: 'fr400xs-auto', field_name: 'Z 轴行程', value: '200', unit: 'mm', sort_order: 2 },
    { id: 1, model_code: 'fr400xs-auto', field_name: 'XY 行程', value: '400*290', unit: 'mm', sort_order: 1 },
    { id: 3, model_code: 'other', field_name: 'XY 行程', value: 'wrong', sort_order: 1 }
  ], 'fr400xs-auto');

  assert.deepEqual(result, [{
    name: '',
    items: [
      { id: '1', label: 'XY 行程', value: '400*290', unit: 'mm' },
      { id: '2', label: 'Z 轴行程', value: '200', unit: 'mm' }
    ]
  }]);
});

test('parameter rows have no group name to split them into sections', () => {
  const result = groupPreviewProductParameters([
    { id: 9, model_code: 'fl1610', field_name: 'XY 行程', value: '1600*1000', sort_order: 2 },
    { id: 8, model_code: 'fl1610', field_name: 'Z 轴行程', value: '500', sort_order: 1 },
    { id: 10, model_code: 'fl1610', field_name: '额定功率', value: '5', unit: 'KVA', sort_order: 3 }
  ], 'fl1610');

  assert.equal(result.length, 1);
  assert.equal(result[0].name, '');
  assert.deepEqual(result[0].items.map((item) => item.id), ['8', '9', '10']);
});

test('preview parameters reject incomplete rows and unsafe ids', () => {
  assert.deepEqual(groupPreviewProductParameters([
    { id: '../1', model_code: 'fr400xs-auto', field_name: 'XY 行程', value: '400*290' },
    { id: 2, model_code: 'fr400xs-auto', field_name: '', value: '200' },
    { id: 3, model_code: 'fr400xs-auto', field_name: 'Z 轴行程', value: '' }
  ], 'fr400xs-auto'), []);
});

test('model preview parameter rows retain their independent record IDs for visual editing', () => {
  const result = normalizePreviewParameterGroups([{
    name: '',
    items: [
      { id: 94, label: 'XY 行程', value: '1100*800', unit: 'mm' },
      { id: '../95', label: '无效参数', value: '500', unit: 'mm' }
    ]
  }]);

  assert.deepEqual(result, [{
    name: '',
    items: [{ id: '94', label: 'XY 行程', value: '1100*800', unit: 'mm' }]
  }]);
});

test('parameter preview retains only the field presentation needed by bound cells', () => {
  const result = groupPreviewProductParameters([{
    id: 94,
    model_code: 'fl1390',
    field_name: 'XY 行程',
    value: '1300*900',
    presentation: { field_presentation: { field_name: { text_style: { enabled: true, size_desktop: 20 } } } }
  }], 'fl1390');

  assert.deepEqual(result[0].items[0].presentation, {
    field_presentation: { field_name: { text_style: { enabled: true, size_desktop: 20 } } }
  });
});

test('saved draft rows are merged over the published table instead of replacing it', () => {
  const merged = mergePreviewParameterRows([
    { id: '', label: 'XY 行程', value: '850*600', unit: 'mm' },
    { id: '', label: 'Z 轴行程', value: '500', unit: 'mm' }
  ], [
    { id: '215', label: '测试', value: '100', unit: 'kg' }
  ]);

  assert.deepEqual(merged, [
    { id: '', label: 'XY 行程', value: '850*600', unit: 'mm' },
    { id: '', label: 'Z 轴行程', value: '500', unit: 'mm' },
    { id: '215', label: '测试', value: '100', unit: 'kg' }
  ]);
});

test('a draft row updates its published row in place while keeping the table order', () => {
  const merged = mergePreviewParameterRows([
    { id: '', label: 'XY 行程', value: '850*600', unit: 'mm' },
    { id: '', label: 'Z 轴行程', value: '500', unit: 'mm' }
  ], [
    { id: '94', label: 'Z 轴行程', value: '600', unit: 'mm' }
  ]);

  assert.deepEqual(merged.map((row) => [row.label, row.value]), [['XY 行程', '850*600'], ['Z 轴行程', '600']]);
  assert.equal(merged[1].id, '94');
});
