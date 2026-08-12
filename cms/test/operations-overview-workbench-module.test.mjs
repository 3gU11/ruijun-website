import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('operations overview workbench is a read-only publisher module', async () => {
  const [manifestText, index, module, endpoint] = await Promise.all([
    ...['package.json', 'src/index.js', 'src/module.vue'].map((file) => readFile(new URL(`extensions/operations-overview-workbench/${file}`, root), 'utf8')),
    readFile(new URL('extensions/operations-overview-endpoint/src/index.js', root), 'utf8')
  ]);
  assert.equal(JSON.parse(manifestText)['directus:extension'].type, 'module');
  assert.match(index, /ruijun-operations-overview-workbench/);
  assert.match(module, /api\.get\('\/operations-overview'/);
  assert.match(module, /常见问题知识风险/);
  assert.match(module, /内容集合状态/);
  assert.match(module, /quick_links/);
  assert.match(endpoint, /ruijun-content-publication-queue-workbench/);
  assert.doesNotMatch(module, /CMS OPERATIONS|FAQ GOVERNANCE|QUICK ACTIONS|CONTENT INVENTORY|FAQ 知识风险|CMS 摘要/);
  assert.doesNotMatch(module, /api\.(post|patch|put|delete)|CMS_BFF_TOKEN|CMS_WRITE_TOKEN/);
});
