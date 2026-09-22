import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('about hero media verifier resolves the governed candidate, protects its preview, and restores the full page snapshot', async () => {
  const script = await readFile(new URL('../scripts/verify-about-hero-media-preview.mjs', import.meta.url), 'utf8');
  assert.match(script, /const pageId = '2';/);
  assert.match(script, /const sectionId = 'hero';/);
  assert.match(script, /const placementKey = 'about\.hero\.background';/);
  assert.match(script, /source_document\]\[_eq\]/);
  assert.match(script, /role: 'background', media_asset_id: assetId/);
  assert.match(script, /contentCollection: 'pages', contentItemId: pageId/);
  assert.match(script, /entry\?\.path === `\/api\/preview\/media\/\$\{assetId\}`/);
  assert.match(script, /data-cms-preview-placement-key="about\\\.hero\\\.background"/);
  assert.match(script, /assert\.deepEqual\(restored\.data\.sections, originalSections\)/);
});
