import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('about timeline media verifier binds the governed candidate and restores the complete page snapshot', async () => {
  const script = await readFile(new URL('../scripts/verify-about-timeline-media-preview.mjs', import.meta.url), 'utf8');
  assert.match(script, /const pageId = '2';/);
  assert.match(script, /const sectionId = 'history';/);
  assert.match(script, /const assetId = '87';/);
  assert.match(script, /assert\.equal\(asset\.data\.placement_key, 'about\.timeline\.background'\);/);
  assert.match(script, /section\.media\.push\(\{ role: mediaRole, media_asset_id: assetId \}\);/);
  assert.match(script, /\/api\/preview\/media\/\$\{assetId\}/);
  assert.match(script, /sections: originalSections/);
});

test('about factory gallery verifier binds a governed candidate and restores the complete page snapshot', async () => {
  const script = await readFile(new URL('../scripts/verify-about-factory-media-preview.mjs', import.meta.url), 'utf8');
  assert.match(script, /const sectionId = 'factory';/);
  assert.match(script, /const assetId = '98';/);
  assert.match(script, /about\.gallery\.image/);
  assert.match(script, /restored: true/);
});
