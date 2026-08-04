import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('product review workbench is a read-only Directus module using the current authenticated session', async () => {
  const [manifestText, index, module] = await Promise.all([
    readFile(new URL('extensions/product-review-workbench/package.json', root), 'utf8'),
    readFile(new URL('extensions/product-review-workbench/src/index.js', root), 'utf8'),
    readFile(new URL('extensions/product-review-workbench/src/module.vue', root), 'utf8')
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest['directus:extension'].type, 'module');
  assert.equal(manifest['directus:extension'].source, 'src/index.js');
  assert.match(index, /id:\s*'ruijun-product-review-workbench'/);
  assert.match(module, /useApi/);
  assert.match(module, /\/items\/product_series/);
  assert.match(module, /\/items\/product_models/);
  assert.match(module, /assessProductModel/);
  assert.match(module, /assessProductSeries/);
  assert.doesNotMatch(module, /api\.(post|patch|put|delete)/);
  assert.doesNotMatch(module, /CMS_BFF_TOKEN|CMS_WRITE_TOKEN|ADMIN_PASSWORD|phone|machine|fault/i);
});
