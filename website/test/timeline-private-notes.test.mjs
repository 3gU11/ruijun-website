import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('timeline templates never render internal evidence as visitor copy', async () => {
  for (const page of ['index', 'about']) {
    const source = await readFile(new URL(`../pages/${page}.vue`, import.meta.url), 'utf8');
    assert.match(source, /<template v-if="cmsVisualEditMode && milestone\[(?:3|6)\](?:\.collection)?"><br><span data-cms-preview-field-path="evidence">\{\{ milestone\[2\] \}\}<\/span><\/template>/);
    assert.equal((source.match(/data-cms-preview-field-path="evidence"/g) || []).length, 1);
    assert.match(source, /visualEditMode: cmsVisualEditMode[\s\S]*?useCmsDraftPreview\(\)/);
  }
});
