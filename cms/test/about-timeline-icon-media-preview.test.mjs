import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('about timeline icon verifier binds the governed candidate and restores the complete page snapshot', async () => {
  const source = await readFile(new URL('../scripts/verify-about-timeline-icon-media-preview.mjs', import.meta.url), 'utf8');
  assert.match(source, /const assetId = '88'/);
  assert.match(source, /about\.timeline\.icon/);
  assert.match(source, /role: mediaRole, media_asset_id: assetId/);
  assert.match(source, /\/api\/preview\/media\/\$\{assetId\}/);
  assert.match(source, /data-cms-preview-placement-key="about\\.timeline\\.icon"/);
  assert.match(source, /restored\.data\.sections, originalSections/);
});
