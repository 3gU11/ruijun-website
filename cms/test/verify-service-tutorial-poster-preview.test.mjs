import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const scriptUrl = new URL('../scripts/verify-service-tutorial-poster-preview.mjs', import.meta.url);

test('service tutorial poster verifier covers upload, binding, protected preview, and cleanup', async () => {
  const source = await readFile(scriptUrl, 'utf8');

  assert.match(source, /service\.tutorial\.poster/);
  assert.match(source, /service\.tutorial\.video/);
  assert.match(source, /content-preview-tokens\/issue/);
  assert.match(source, /api\/preview\/media/);
  assert.match(source, /service_resources/);
  assert.match(source, /poster_asset_id/);
  assert.match(source, /finally/);
  assert.match(source, /DELETE/);
  await access(scriptUrl);
});
