import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('product release workbench uses the protected endpoint and never holds CMS credentials', async () => {
  const [manifestText, index, module] = await Promise.all([
    readFile(new URL('extensions/product-release-workbench/package.json', root), 'utf8'),
    readFile(new URL('extensions/product-release-workbench/src/index.js', root), 'utf8'),
    readFile(new URL('extensions/product-release-workbench/src/module.vue', root), 'utf8')
  ]);
  const manifest = JSON.parse(manifestText);
  assert.equal(manifest['directus:extension'].type, 'module');
  assert.match(index, /ruijun-product-release-workbench/);
  assert.match(module, /api.get\('\/product-release\/readiness'/);
  assert.match(module, /api.post\('\/product-release\/publish'/);
  assert.match(module, /api.get\('\/product-release\/history'/);
  assert.match(module, /api.post\(`\/product-release\/\$\{selectedRestore\.value\.id\}\/restore`/);
  assert.match(module, /api.post\(`\/product-release\/\$\{report\.value\.active\.id\}\/cache-invalidate`/);
  assert.match(module, /cache_invalidation_status/);
  assert.match(module, /重试刷新/);
  assert.match(module, /report\.issues/);
  assert.match(module, /恢复原因/);
  assert.match(module, /selectedRestore/);
  assert.doesNotMatch(module, /window\.prompt|window\.confirm/);
  assert.doesNotMatch(module, /CMS_BFF_TOKEN|CMS_WRITE_TOKEN|ADMIN_PASSWORD/);
});
