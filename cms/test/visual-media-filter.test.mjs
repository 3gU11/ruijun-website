import assert from 'node:assert/strict';
import test from 'node:test';
import { filterVisualMediaAssets, isApprovedVisualMedia } from '../extensions/content-editor-workbench/src/visual-media-filter.js';

const base = { id: 'asset-1', file_id: 'file-1', status: 'published', publication_state: 'published', enabled: true, usage_scope: 'brand', copyright_status: 'authorized', media_type: 'image' };

test('visual media filter only allows published, enabled, approved and scope-matched assets', () => {
  assert.equal(isApprovedVisualMedia(base, { scope: 'brand', elementType: 'image' }), true);
  assert.equal(isApprovedVisualMedia({ ...base, status: 'draft' }, { scope: 'brand' }), false);
  assert.equal(isApprovedVisualMedia({ ...base, copyright_status: 'pending_review' }, { scope: 'brand' }), false);
  assert.equal(isApprovedVisualMedia({ ...base, usage_scope: 'product' }, { scope: 'brand' }), false);
  assert.deepEqual(filterVisualMediaAssets([base, { ...base, id: 'draft', status: 'draft' }], { scope: 'brand' }).map((asset) => asset.id), ['asset-1']);
});

test('visual media filter enforces placement and media type for the selected canvas element', () => {
  assert.equal(isApprovedVisualMedia({ ...base, placement_key: 'about.partners.gallery' }, { scope: 'brand', placementKey: 'about.partners.gallery', elementType: 'image' }), true);
  assert.equal(isApprovedVisualMedia({ ...base, placement_key: 'about.clients.gallery' }, { scope: 'brand', placementKey: 'about.partners.gallery' }), false);
  assert.equal(isApprovedVisualMedia({ ...base, media_type: 'video' }, { scope: 'brand', elementType: 'image' }), false);
  assert.equal(isApprovedVisualMedia({ ...base, media_type: 'video' }, { scope: 'brand', elementType: 'video' }), true);
});

test('approved visual media with page metadata cannot cross section boundaries', () => {
  const sectionAsset = { ...base, page_key: 'manufacturing', section_key: 'precision-machining', placement_key: 'manufacturing.layer.image' };
  assert.equal(isApprovedVisualMedia(sectionAsset, { scope: 'brand', pageKey: 'manufacturing', sectionKey: 'precision-machining' }), true);
  assert.equal(isApprovedVisualMedia(sectionAsset, { scope: 'brand', pageKey: 'manufacturing', sectionKey: 'sheet-metal' }), false);
});
