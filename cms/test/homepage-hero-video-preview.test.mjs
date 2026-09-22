import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('homepage hero video verifier uploads a distinct temporary video, previews the selected asset, and restores the page snapshot', async () => {
  const script = await readFile(new URL('../scripts/verify-homepage-hero-video-preview.mjs', import.meta.url), 'utf8');
  assert.match(script, /const pageId = '1';/);
  assert.match(script, /const sectionId = 'hero';/);
  assert.match(script, /home-intro\.mp4/);
  assert.match(script, /new FormData\(\)/);
  assert.match(script, /\$\{cmsUrl\}\/files/);
  assert.match(script, /\$\{cmsUrl\}\/items\/media_assets/);
  assert.match(script, /home\.hero\.video/);
  assert.match(script, /hero_video_asset_id = String\(assetId\)/);
  assert.match(script, /hero_video_asset_url/);
  assert.match(script, /\/api\/preview\/media\/\$\{assetId\}/);
  assert.match(script, /await mediaResponse\.arrayBuffer\(\)/);
  assert.match(script, /data-cms-preview-placement-key="home\\\.hero\\\.video"/);
  assert.match(script, /sections: originalSections/);
  assert.match(script, /items\/media_assets\/.*method: 'DELETE'/);
  assert.match(script, /files\/.*method: 'DELETE'/);
});
