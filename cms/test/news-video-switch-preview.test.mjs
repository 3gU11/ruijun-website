import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('video-share verifier switches a draft article to a different governed video and restores it', async () => {
  const script = await readFile(new URL('../scripts/verify-news-video-switch-preview.mjs', import.meta.url), 'utf8');
  assert.match(script, /const articleId = '36';/);
  assert.match(script, /home-intro\.mp4/);
  assert.match(script, /news\.video_share\.list/);
  assert.match(script, /media: \[\{ media_asset_id: assetId \}\]/);
  assert.match(script, /media\?\.\[0\]\?\.path/);
  assert.match(script, /api\/preview\/media\/\$\{assetId\}/);
  assert.match(script, /items\/articles\/\$\{articleId\}[\s\S]*method: 'PATCH'/s);
  assert.match(script, /originalMedia/);
  assert.match(script, /method: 'DELETE'/);
});
