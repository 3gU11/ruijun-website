import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('homepage reason media verifier binds a governed draft and restores the complete page snapshot', async () => {
  const source = await readFile(new URL('../scripts/verify-homepage-reason-media-preview.mjs', import.meta.url), 'utf8');
  assert.match(source, /const pageId = '1';/);
  assert.match(source, /const sectionId = 'advanced-manufacturing';/);
  assert.match(source, /const assetId = '90';/);
  assert.match(source, /home\.reason\.background/);
  assert.match(source, /section\.media\.push\(\{ role: mediaRole, media_asset_id: assetId \}\)/);
  assert.match(source, /const expectedPreviewMedia = sectionFor\(originalSections\)\.media\.map/);
  assert.match(source, /assert\.deepEqual\(previewMedia, expectedPreviewMedia\)/);
  assert.match(source, /\/api\/preview\/media\/\$\{assetId\}/);
  assert.match(source, /sections: originalSections/);
});

test('homepage reason machine verifier binds the governed foreground candidate and restores the complete page snapshot', async () => {
  const source = await readFile(new URL('../scripts/verify-homepage-reason-machine-media-preview.mjs', import.meta.url), 'utf8');
  assert.match(source, /const sectionId = 'performance';/);
  assert.match(source, /const assetId = '89';/);
  assert.match(source, /home\.reason\.machine/);
  assert.match(source, /role: mediaRole, media_asset_id: assetId/);
  assert.match(source, /const expectedPreviewMedia = sectionFor\(originalSections\)\.media\.map/);
  assert.match(source, /assert\.deepEqual\(previewMedia, expectedPreviewMedia\)/);
  assert.match(source, /\/api\/preview\/media\/\$\{assetId\}/);
  assert.match(source, /sections: originalSections/);
});
