import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('lead workbench is a Directus module that only uses the authenticated lead collection workflow', async () => {
  const [manifestText, index, module] = await Promise.all([
    readFile(new URL('extensions/lead-workbench/package.json', root), 'utf8'),
    readFile(new URL('extensions/lead-workbench/src/index.js', root), 'utf8'),
    readFile(new URL('extensions/lead-workbench/src/module.vue', root), 'utf8')
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest['directus:extension'].type, 'module');
  assert.equal(manifest['directus:extension'].source, 'src/index.js');
  assert.match(index, /id:\s*'ruijun-lead-workbench'/);
  assert.match(module, /useApi/);
  assert.match(module, /\/items\/leads/);
  assert.match(module, /status:\s*'assigned'/);
  assert.match(module, /status:\s*'in_progress'/);
  assert.match(module, /converted/);
  assert.match(module, /activity_log/);
  assert.doesNotMatch(module, /CMS_BFF_TOKEN|CMS_WRITE_TOKEN|ADMIN_PASSWORD/);
});
