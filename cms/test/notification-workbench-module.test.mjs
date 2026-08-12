import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('notification workbench is a Directus module limited to authenticated notification-job handling', async () => {
  const [manifestText, index, module] = await Promise.all([
    readFile(new URL('extensions/notification-workbench/package.json', root), 'utf8'),
    readFile(new URL('extensions/notification-workbench/src/index.js', root), 'utf8'),
    readFile(new URL('extensions/notification-workbench/src/module.vue', root), 'utf8')
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest['directus:extension'].type, 'module');
  assert.equal(manifest['directus:extension'].source, 'src/index.js');
  assert.match(index, /id:\s*'ruijun-notification-workbench'/);
  assert.match(module, /useApi/);
  assert.match(module, /\/items\/lead_notification_jobs/);
  assert.match(module, /manual_review/);
  assert.match(module, /manual_sent/);
  assert.match(module, /resolved/);
  assert.match(module, /manual_note/);
  assert.match(module, /typeof value !== 'string' \|\| !value\.trim\(\)/);
  assert.doesNotMatch(module, /CMS_NOTIFICATION_WORKER_TOKEN|CMS_BFF_TOKEN|ADMIN_PASSWORD/);
});
