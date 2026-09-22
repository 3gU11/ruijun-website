import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('third service office region verifier updates only its exact nested title and restores it', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const script = await readFile(new URL('../scripts/verify-service-office-third-region-preview.mjs', import.meta.url), 'utf8');

  assert.equal(packageJson.scripts['visual:verify-service-office-third-region'], 'node ./scripts/verify-service-office-third-region-preview.mjs');
  assert.match(script, /pageId = '3'/);
  assert.match(script, /id === 'office-directory'/);
  assert.match(script, /items\[2\]\.title = marker/);
  assert.match(script, /items\[0\]\.title/);
  assert.match(script, /items\[1\]\.title/);
  assert.match(script, /sectionKey: 'office-directory'/);
  assert.match(script, /data-cms-preview-key="office-directory"/);
  assert.match(script, /restored: true/);
});
