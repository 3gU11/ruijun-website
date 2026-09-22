import assert from 'node:assert/strict';
import test from 'node:test';

const { createManufacturingMediaBinding } = await import('../shared/manufacturing-media-binding.mjs');

test('manufacturing PSD fallback media remains read-only without a managed CMS asset', () => {
  assert.equal(createManufacturingMediaBinding({
    collection: 'manufacturing_evidence', itemId: 1, index: 0,
    entry: { path: '/assets/psd/reason-factory-full.jpg' }
  }), null);
});

test('manufacturing media binds the real evidence record and array field when sourced from CMS media', () => {
  assert.deepEqual(createManufacturingMediaBinding({
    collection: 'manufacturing_evidence', itemId: 1, index: 2,
    entry: { path: 'http://127.0.0.1:8055/assets/file-7', managed: true, mediaType: 'video' }
  }), {
    collection: 'manufacturing_evidence', itemId: '1', fieldPath: 'media.2', mediaRole: 'video'
  });
});

test('manufacturing media rejects missing record identity and invalid indexes', () => {
  assert.equal(createManufacturingMediaBinding({ collection: '', itemId: 1, index: 0, entry: { managed: true, path: '/assets/file-7' } }), null);
  assert.equal(createManufacturingMediaBinding({ collection: 'manufacturing_evidence', itemId: 1, index: -1, entry: { managed: true, path: '/assets/file-7' } }), null);
});

test('a declared PSD layer has a controlled empty media slot before its first CMS asset is assigned', () => {
  assert.deepEqual(createManufacturingMediaBinding({
    collection: 'pages', itemId: 8, index: 0, role: 'cnc-main', entry: { path: '/assets/manufacturing-psd/layers/cnc-main.png' }
  }), {
    collection: 'pages', itemId: '8', fieldPath: 'media.0', mediaRole: 'image', mediaSlot: 'cnc-main'
  });
});

test('a persisted page layer retains the same governed slot after replacement', () => {
  assert.deepEqual(createManufacturingMediaBinding({
    collection: 'pages', itemId: 8, index: 0, role: 'cnc-main',
    entry: { path: '/api/preview/media/56', managed: true, mediaType: 'image' }
  }), {
    collection: 'pages', itemId: '8', fieldPath: 'media.0', mediaRole: 'image', mediaSlot: 'cnc-main'
  });
});
