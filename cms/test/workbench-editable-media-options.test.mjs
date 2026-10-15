import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { editorialMediaAssets } from '../extensions/content-editor-workbench/src/editorial-media-assets.js';

test('workbench exposes matching private draft media to edit-time selectors without weakening published media readers', async () => {
  // The workbench now spans module.vue plus the modules it imports; asserting
  // against only module.vue made these checks depend on file layout rather than
  // on the behaviour they describe.
  const [module, draftShapes] = await Promise.all([
    readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8'),
    readFile(new URL('../extensions/content-editor-workbench/src/draft-shapes.js', import.meta.url), 'utf8')
  ]);
  const source = module + '\n' + draftShapes;
  assert.match(source, /function editableMediaAssets\(scope, options = \{\}\)/);
  assert.match(source, /const staging = filterPreviewStagingMediaAssets\(mediaCandidates\.value, \{ scope, \.\.\.options \}\)/);
  assert.match(source, /function editableMediaAssetsForPlacement\(scope, placementKey, elementType = ''\)/);
  assert.match(source, /editableMediaAssetsForPlacement\('product', 'product\.series\.cover', 'image'\)/);
  assert.match(source, /editableMediaAssetsForPlacement\('brand', 'about\.timeline\.icon', 'image'\)/);
  assert.match(source, /function eligibleEditorialMediaAssets\(category\)\s*\{\s*return editorialMediaAssets\(/);
  const draft = { id: '12', file_id: 'file', usage_scope: 'article', media_type: 'video', mime_type: 'video/mp4', placement_key: 'news.video_share.list', page_key: 'news', section_key: 'video-sharing', enabled: true, status: 'draft', publication_state: 'unpublished' };
  assert.deepEqual(editorialMediaAssets({ category: 'video', publishedAssets: [], candidates: [draft, { ...draft, id: '13', page_key: 'home' }, { ...draft, id: '14', enabled: false }] }), [draft]);
  assert.match(source, /reviewedMediaAssets\(scope\)\.filter/);
});
