import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('content publication queue uses the authenticated Directus session for generic publish, unpublish, and archive transitions', async () => {
  const [manifestText, index, module] = await Promise.all([
    readFile(new URL('extensions/content-publication-queue-workbench/package.json', root), 'utf8'),
    readFile(new URL('extensions/content-publication-queue-workbench/src/index.js', root), 'utf8'),
    readFile(new URL('extensions/content-publication-queue-workbench/src/module.vue', root), 'utf8')
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest['directus:extension'].type, 'module');
  assert.equal(manifest['directus:extension'].source, 'src/index.js');
  assert.match(index, /ruijun-content-publication-queue-workbench/);
  assert.match(module, /待发布/);
  assert.match(module, /已发布/);
  assert.match(module, /已下线/);
  assert.match(module, /target: 'published'/);
  assert.match(module, /target: 'unpublished'/);
  assert.match(module, /target: 'archived'/);
  assert.match(module, /ruijun-product-release-workbench/);
  assert.doesNotMatch(module, /collection: 'product_series'/);
  assert.doesNotMatch(module, /collection: 'product_models'/);
  assert.doesNotMatch(module, /collection: 'product_parameters'/);
  assert.match(module, /filter\[status\]\[_eq\]/);
  assert.match(module, /Promise\.allSettled/);
  assert.match(module, /review_note/);
  assert.match(module, /api\.patch\(`\/items\/\$\{encodeURIComponent\(record\.collection\)\}/);
  assert.match(module, /status: activeModeDefinition\.value\.target/);
  assert.doesNotMatch(module, /CMS_BFF_TOKEN|CMS_WRITE_TOKEN|ADMIN_PASSWORD/);
  assert.doesNotMatch(module, /api\.(post|put|delete)\(/);
});
