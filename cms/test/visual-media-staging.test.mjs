import assert from 'node:assert/strict';
import test from 'node:test';

import { filterPreviewStagingMediaAssets, isPreviewStagingMedia } from '../extensions/content-editor-workbench/src/visual-media-staging.js';

const candidate = {
  id: 'draft-1', file_id: 'file-1', enabled: true,
  status: 'draft', publication_state: 'unpublished',
  usage_scope: 'product', placement_key: 'product.gallery.image', media_type: 'image',
  page_key: 'product', section_key: 'models',
  copyright_status: 'pending_review'
};

test('preview staging filter accepts an enabled private draft that matches the canvas position', () => {
  assert.equal(isPreviewStagingMedia(candidate, { scope: 'product', placementKey: 'product.gallery.image', elementType: 'image' }), true);
  assert.deepEqual(filterPreviewStagingMediaAssets([candidate], { scope: 'product' }).map((asset) => asset.id), ['draft-1']);
});

test('preview staging candidates cannot cross page or section boundaries inside the canvas', () => {
  const otherSection = { ...candidate, id: 'draft-2', section_key: 'technical-drawing' };
  assert.equal(isPreviewStagingMedia(candidate, { pageKey: 'product', sectionKey: 'models' }), true);
  assert.equal(isPreviewStagingMedia(candidate, { pageKey: 'product', sectionKey: 'technical-drawing' }), false);
  assert.equal(isPreviewStagingMedia(candidate, { pageKey: 'manufacturing', sectionKey: 'models' }), false);
  assert.deepEqual(filterPreviewStagingMediaAssets([candidate, otherSection], { pageKey: 'product', sectionKey: 'models' }).map((asset) => asset.id), ['draft-1']);
});

test('preview staging filter excludes public, non-draft, disabled, mismatched and wrong-type media', () => {
  assert.equal(isPreviewStagingMedia({ ...candidate, status: 'published', publication_state: 'published' }, { scope: 'product' }), false);
  assert.equal(isPreviewStagingMedia({ ...candidate, status: 'review' }, { scope: 'product' }), false);
  assert.equal(isPreviewStagingMedia({ ...candidate, enabled: false }, { scope: 'product' }), false);
  assert.equal(isPreviewStagingMedia(candidate, { scope: 'brand' }), false);
  assert.equal(isPreviewStagingMedia(candidate, { placementKey: 'product.hero.image' }), false);
  assert.equal(isPreviewStagingMedia(candidate, { elementType: 'video' }), false);
});
