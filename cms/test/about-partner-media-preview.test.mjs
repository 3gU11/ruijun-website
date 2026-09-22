import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('about partner media verifier writes the governed gallery slot, renders protected preview media, and restores the page snapshot', async () => {
  const script = await readFile(new URL('../scripts/verify-about-partner-media-preview.mjs', import.meta.url), 'utf8');
  assert.match(script, /const pageId = '2';/);
  assert.match(script, /const sectionId = 'partners';/);
  assert.match(script, /const assetId = '102';/);
  assert.match(script, /role: 'partner-1', media_asset_id: assetId/);
  assert.match(script, /contentCollection: 'pages', contentItemId: pageId/);
  assert.match(script, /\/api\/preview\/media\/\$\{assetId\}/);
  assert.match(script, /data-cms-preview-placement-key="about\\.partner\\.image"/);
  assert.match(script, /assert\.deepEqual\(restored\.data\.sections, originalSections\)/);
});
