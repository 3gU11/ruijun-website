import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('qualification media verifier targets the independent qualification record and restores its assets', async () => {
  const script = await readFile(new URL('../scripts/verify-about-qualification-media-preview.mjs', import.meta.url), 'utf8');
  assert.match(script, /const qualificationId = '1';/);
  assert.match(script, /const assetId = '113';/);
  assert.match(script, /\/items\/qualifications\/\$\{qualificationId\}/);
  assert.match(script, /contentCollection: 'qualifications', contentItemId: qualificationId/);
  assert.match(script, /assets: \[\{ alt: originalAlt, media_asset_id: assetId \}\]/);
  assert.match(script, /data-cms-preview-placement-key="qualification\\\.image"/);
  assert.match(script, /assert\.deepEqual\(restored\.data\.assets, originalAssets\)/);
});
