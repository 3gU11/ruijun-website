import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('dynamic-news empty-state preview verifier covers save, preview target, and cleanup', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const script = await readFile(new URL('../scripts/verify-news-empty-state-preview.mjs', import.meta.url), 'utf8');

  assert.equal(packageJson.scripts['visual:verify-news-empty-state'], 'node ./scripts/verify-news-empty-state-preview.mjs');
  assert.match(script, /pageId = '9'/);
  assert.match(script, /id === 'dynamic-news'/);
  assert.match(script, /description/);
  assert.match(script, /sectionKey: 'dynamic-news'/);
  assert.match(script, /data-cms-preview-key="dynamic-news"/);
  assert.match(script, /restored: true/);
});
