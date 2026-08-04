import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('service content review workbench is a read-only Directus module using the current authenticated session', async () => {
  const [manifestText, index, module] = await Promise.all([
    readFile(new URL('extensions/service-content-review-workbench/package.json', root), 'utf8'),
    readFile(new URL('extensions/service-content-review-workbench/src/index.js', root), 'utf8'),
    readFile(new URL('extensions/service-content-review-workbench/src/module.vue', root), 'utf8')
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest['directus:extension'].type, 'module');
  assert.equal(manifest['directus:extension'].source, 'src/index.js');
  assert.match(index, /id:\s*'ruijun-service-content-review-workbench'/);
  assert.match(module, /useApi/);
  assert.match(module, /\/items\/service_resources/);
  assert.match(module, /\/items\/service_locations/);
  assert.match(module, /\/items\/external_service_entries/);
  assert.match(module, /assessServiceResource/);
  assert.match(module, /assessServiceLocation/);
  assert.match(module, /assessServiceEntry/);
  assert.doesNotMatch(module, /api\.(post|patch|put|delete)/);
  assert.doesNotMatch(module, /CMS_BFF_TOKEN|CMS_WRITE_TOKEN|ADMIN_PASSWORD/);
  assert.doesNotMatch(module, /\{\{[^}]+(?:fallback_phone|contact|url)[^}]*\}\}/i);
});
