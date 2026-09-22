import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('service hero media verifier binds only the governed service candidate and restores the complete page snapshot', async () => {
  const script = await readFile(new URL('../scripts/verify-service-hero-media-preview.mjs', import.meta.url), 'utf8');
  assert.match(script, /const pageId = '3';/);
  assert.match(script, /const sectionId = 'hero';/);
  assert.match(script, /const assetId = '86';/);
  assert.match(script, /assert\.equal\(asset\.data\.placement_key, 'service\.hero\.image'\);/);
  assert.match(script, /section\.media\.push\(\{ role: mediaRole, media_asset_id: assetId \}\);/);
  assert.match(script, /\/api\/preview\/media\/\$\{assetId\}/);
  assert.match(script, /sections: originalSections/);
});
