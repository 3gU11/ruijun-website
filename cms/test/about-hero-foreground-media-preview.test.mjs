import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('about hero foreground verifier targets only the governed machine layer and restores the full page snapshot', async () => {
  const script = await readFile(new URL('../scripts/verify-about-hero-foreground-media-preview.mjs', import.meta.url), 'utf8');
  assert.match(script, /const placementKey = 'about\.hero\.foreground';/);
  assert.match(script, /reason-intro-machine\.png/);
  assert.match(script, /role: 'foreground', media_asset_id: assetId/);
  assert.match(script, /data-cms-preview-placement-key="about\\\.hero\\\.foreground"/);
  assert.match(script, /assert\.deepEqual\(restored\.data\.sections, originalSections\)/);
});
