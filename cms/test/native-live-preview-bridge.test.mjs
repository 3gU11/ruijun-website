import assert from 'node:assert/strict';
import test from 'node:test';
import { collectNativePreviewRecord, connectNativeCodeMirrorEditors, nativeContentTarget } from '../extensions/content-editor-workbench/src/native-live-preview-bridge.js';

test('native preview target accepts item edit routes only', () => {
  assert.deepEqual(nativeContentTarget('/admin/content/product_models/1'), { collection: 'product_models', itemId: '1' });
  assert.equal(nativeContentTarget('/admin/content/product_models'), null);
  assert.equal(nativeContentTarget('/admin/settings/data-model/product_models'), null);
});

test('native form collection only reads preview-whitelisted fields', () => {
  const elements = [
    { dataset: { collection: 'product_models', field: 'name' }, querySelector: () => null, querySelectorAll: () => [{ type: 'text', value: 'FR400XS Live', disabled: false }] },
    { dataset: { collection: 'product_models', field: 'presentation' }, querySelector: () => ({ CodeMirror: { getValue: () => '{"field_presentation":{"model_code":{"text_style":{"enabled":true,"size_desktop":24}}}}' } }), querySelectorAll: () => [] },
    { dataset: { collection: 'product_models', field: 'source_document' }, querySelector: () => null, querySelectorAll: () => [{ type: 'text', value: 'private.pdf', disabled: false }] }
  ];
  const root = { querySelectorAll: () => elements };
  assert.deepEqual(collectNativePreviewRecord(root, { collection: 'product_models', itemId: '1' }), {
    id: '1', name: 'FR400XS Live', presentation: { field_presentation: { model_code: { text_style: { enabled: true, size_desktop: 24 } } } }
  });
});

test('native form collection parses current CodeMirror JSON without saving', () => {
  const element = {
    dataset: { collection: 'product_models', field: 'parameters' },
    querySelector: () => ({ CodeMirror: { getValue: () => '{"xyTravelMm":"401*290"}' } }),
    querySelectorAll: () => []
  };
  const root = { querySelectorAll: () => [element] };
  assert.deepEqual(collectNativePreviewRecord(root, { collection: 'product_models', itemId: '1' }), { id: '1', parameters: { xyTravelMm: '401*290' } });
});

test('native form collection reads the no-code structured parameter interface', () => {
  const element = {
    dataset: { collection: 'product_models', field: 'parameters' },
    querySelector: (selector) => selector === '[data-ruijun-structured-value]'
      ? { getAttribute: () => '{"xyTravelMm":"40*290","machineWeightKg":1850}' }
      : null,
    querySelectorAll: () => []
  };
  const root = { querySelectorAll: () => [element] };
  assert.deepEqual(collectNativePreviewRecord(root, { collection: 'product_models', itemId: '1' }), {
    id: '1', parameters: { xyTravelMm: '40*290', machineWeightKg: 1850 }
  });
});

test('native preview subscribes to CodeMirror changes including deletion', () => {
  let changeHandler;
  let updateCount = 0;
  const editor = {
    on(event, handler) {
      assert.equal(event, 'change');
      changeHandler = handler;
    }
  };
  const root = { querySelectorAll: () => [{ CodeMirror: editor }] };
  const connected = new WeakSet();

  assert.equal(connectNativeCodeMirrorEditors(root, () => { updateCount += 1; }, connected), 1);
  assert.equal(connectNativeCodeMirrorEditors(root, () => { updateCount += 1; }, connected), 0);

  changeHandler(editor, { origin: '+delete', removed: ['0'], text: [''] });
  assert.equal(updateCount, 1);
});
