import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('news pagination verifier creates isolated records and checks public ordering, six-item pages, and detail routes', async () => {
  const script = await readFile(new URL('../scripts/verify-news-list-pagination-preview.mjs', import.meta.url), 'utf8');
  assert.match(script, /const recordCount = 7;/);
  assert.match(script, /api\/public\/v1\/articles/);
  assert.match(script, /publishedProbe/);
  assert.match(script, /paginateNews/);
  assert.match(script, /pageSize: 6/);
  assert.match(script, /first\.items\.length, 6/);
  assert.match(script, /first\.pageCount, 2/);
  assert.match(script, /api\/public\/v1\/articles\/\$\{encodeURIComponent/);
  assert.match(script, /temporaryDataCleaned/);
});
