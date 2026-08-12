import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
test('FAQ knowledge review workbench is a read-only module backed by the protected endpoint', async () => {
  const [manifestText, index, module] = await Promise.all([
    'package.json', 'src/index.js', 'src/module.vue'
  ].map((file) => readFile(new URL('extensions/knowledge-review-workbench/' + file, root), 'utf8')));
  assert.equal(JSON.parse(manifestText)['directus:extension'].type, 'module');
  assert.match(index, /ruijun-knowledge-review-workbench/);
  assert.match(index, /常见问题知识审核/);
  assert.match(module, /常见问题审核概览/);
  assert.match(module, /api\.get\('\/knowledge-review'/);
  assert.match(module, /selectedRisk/);
  assert.match(module, /selectedVisibility/);
  assert.match(module, /blockedOnly/);
  assert.match(module, /item.edit_path/);
  assert.doesNotMatch(module, /api.(post|patch|put|delete)|CMS_BFF_TOKEN|CMS_WRITE_TOKEN/);
  assert.doesNotMatch(module, /FAQ 知识审核|FAQ 审核/);
});
