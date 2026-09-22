import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const scriptPath = new URL('../scripts/verify-service-office-media-preview.mjs', import.meta.url);

test('service office media verifier covers independent region image and map slots and restores the page', async () => {
  const source = await readFile(scriptPath, 'utf8');
  assert.match(source, /service\.office\.image/);
  assert.match(source, /service\.office\.map/);
  assert.match(source, /office-1/);
  assert.match(source, /office-map-1/);
  assert.match(source, /media_asset_id/);
  assert.match(source, /restored/);
});
