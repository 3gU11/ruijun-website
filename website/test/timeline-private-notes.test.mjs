import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('timeline templates never render internal evidence as visitor copy', async () => {
  for (const page of ['index', 'about']) {
    const source = await readFile(new URL(`../pages/${page}.vue`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /data-cms-preview-field-path="evidence"/);
  }
});
