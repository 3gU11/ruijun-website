import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('dynamic-news cover verifier keeps a private draft cover inside the authorized preview only', async () => {
  const script = await readFile(new URL('../scripts/verify-news-dynamic-cover-preview.mjs', import.meta.url), 'utf8');

  assert.match(script, /news\.dynamic_news\.cover/);
  assert.match(script, /category: 'news'/);
  assert.match(script, /cover_asset: assetId/);
  assert.match(script, /content-preview-tokens\/issue/);
  assert.match(script, /api\/preview\/media\/\$\{assetId\}/);
  assert.match(script, /api\/public\/v1\/articles/);
  assert.match(script, /does not expose the private draft article/);
  assert.match(script, /method: 'DELETE'/);
});
