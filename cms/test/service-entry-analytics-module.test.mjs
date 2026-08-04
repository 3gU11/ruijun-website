import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('service entry analytics module uses only authenticated aggregate reads of anonymous attribution fields', async () => {
  const [manifestText, index, module] = await Promise.all([
    readFile(new URL('extensions/service-entry-analytics/package.json', root), 'utf8'),
    readFile(new URL('extensions/service-entry-analytics/src/index.js', root), 'utf8'),
    readFile(new URL('extensions/service-entry-analytics/src/module.vue', root), 'utf8')
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest['directus:extension'].type, 'module');
  assert.equal(manifest['directus:extension'].source, 'src/index.js');
  assert.match(index, /id:\s*'ruijun-service-entry-analytics'/);
  assert.match(module, /useApi/);
  assert.match(module, /\/items\/service_entry_clicks/);
  assert.match(module, /aggregate\[count\]=\*/);
  assert.match(module, /groupBy\[\]=entry_type/);
  assert.match(module, /groupBy\[\]=source_page/);
  assert.doesNotMatch(module, /CMS_BFF_TOKEN|CMS_WRITE_TOKEN|ADMIN_PASSWORD|phone|machine|fault/i);
});
