import assert from 'node:assert/strict';
import test from 'node:test';
import { formatProductDrawingMediaLabel, orderProductDrawingMediaAssets } from '../extensions/content-editor-workbench/src/product-drawing-media.js';

test('product drawing candidates prioritize an explicitly matching model and retain every eligible candidate', () => {
  const assets = [
    { id: 31, title: 'FRAUTO600 尺寸参数图', original_file_name: '600.png', mime_type: 'image/png' },
    { id: 27, title: 'FL1610 尺寸参数图', original_file_name: '1610.png', mime_type: 'image/png' },
    { id: 26, title: 'FL1390 尺寸参数图', original_file_name: '1390.png', mime_type: 'image/png' }
  ];

  const ordered = orderProductDrawingMediaAssets(assets, 'fl1610');

  assert.deepEqual(ordered.map((asset) => asset.id), [27, 26, 31]);
  assert.equal(ordered.length, 3);
});

test('product drawing candidate labels use the managed title so repeated filenames stay distinguishable', () => {
  assert.equal(
    formatProductDrawingMediaLabel({ id: 40, title: 'PRO400 尺寸参数图', original_file_name: '400.png', mime_type: 'image/png' }),
    'PRO400 尺寸参数图 · 400.png · image/png'
  );
});

test('product drawing ordering does not guess a model match from a partial filename', () => {
  const assets = [
    { id: 30, title: 'FRAUTO500 尺寸参数图', original_file_name: '500.png' },
    { id: 31, title: 'FRAUTO600 尺寸参数图', original_file_name: '600.png' }
  ];

  assert.deepEqual(orderProductDrawingMediaAssets(assets, 'fr400xs-auto').map((asset) => asset.id), [30, 31]);
});
