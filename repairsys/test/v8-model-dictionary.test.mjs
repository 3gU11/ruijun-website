import assert from 'node:assert/strict';
import test from 'node:test';
import { attachMaterialFallback, mapV8ModelDictionaryRows } from '../server/store.js';

test('maps V8 model_dictionary rows to the customer model contract', () => {
  const models = mapV8ModelDictionaryRows([
    { id: 18, model_code: 'VMC850', model_name: 'VMC850 标准型', series: 'VMC', enabled: 1, sort_order: 2 },
    { source_id: 'm-19', code: 'VMC1060', name: 'VMC1060', is_enabled: true, display_order: 1 },
    { code: 'DISABLED', name: 'Disabled', enabled: 0 }
  ]);

  assert.deepEqual(models, [
    { id: 'm-19', code: 'VMC1060', name: 'VMC1060', series: 'VMC', sortOrder: 1, source: 'V8:model_dictionary', photoItems: [] },
    { id: '18', code: 'VMC850', name: 'VMC850 标准型', series: 'VMC', sortOrder: 2, source: 'V8:model_dictionary', photoItems: [] }
  ]);
});

test('rejects malformed V8 model rows and normalizes enabled flags', () => {
  assert.deepEqual(mapV8ModelDictionaryRows([
    { code: '', name: 'missing code', enabled: 1 },
    { code: 'VMC850', name: 'VMC850', status: 'disabled' },
    { code: 'VMC1160', name: 'VMC1160', status: 'disabled' },
    { code: 'VMC1180', name: 'VMC1180', status: 'active' }
  ]), [
    { id: 'VMC1180', code: 'VMC1180', name: 'VMC1180', series: 'VMC', sortOrder: 1, source: 'V8:model_dictionary', photoItems: [] }
  ]);
});

test('adds clearly labelled repair-material fallbacks when V8 has no model-to-material mapping', () => {
  const [model] = attachMaterialFallback([
    { id: 'VMC850', code: 'VMC850', name: 'VMC850', source: 'V8:model_dictionary', photoItems: [] }
  ], [
    { materialCode: 'DRV-001', name: '驱动板', type: '电控', spec: 'A-001' }
  ]);

  assert.equal(model.materialSource, 'repair-system:material-fallback');
  assert.deepEqual(model.photoItems, [{
    code: 'DRV-001', name: '驱动板', type: '电控', spec: 'A-001',
    shootingRequirement: '', required: false, ocrEnabled: false, ocrProfile: '', sortOrder: 1
  }]);
});
