import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { editorialMediaAssets } from '../extensions/content-editor-workbench/src/editorial-media-assets.js';

test('workbench exposes matching private draft media to edit-time selectors without weakening published media readers', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /function editableMediaAssets\(scope, options = \{\}\)/);
  assert.match(module, /const staging = filterPreviewStagingMediaAssets\(mediaCandidates\.value, \{ scope, \.\.\.options \}\)/);
  assert.match(module, /function editableMediaAssetsForPlacement\(scope, placementKey, elementType = ''\)/);
  assert.match(module, /editableMediaAssetsForPlacement\('product', 'product\.gallery\.image', 'image'\)/);
  assert.match(module, /editableMediaAssetsForPlacement\('brand', 'about\.timeline\.icon', 'image'\)/);
  assert.match(module, /function eligibleEditorialMediaAssets\(category\)\s*\{\s*return editorialMediaAssets\(/);
  const draft = { id: '12', file_id: 'file', usage_scope: 'article', media_type: 'video', mime_type: 'video/mp4', placement_key: 'news.video_share.list', page_key: 'news', section_key: 'video-sharing', enabled: true, status: 'draft', publication_state: 'unpublished' };
  assert.deepEqual(editorialMediaAssets({ category: 'video', publishedAssets: [], candidates: [draft, { ...draft, id: '13', page_key: 'home' }, { ...draft, id: '14', enabled: false }] }), [draft]);
  assert.match(module, /reviewedMediaAssets\(scope\)\.filter/);
});
