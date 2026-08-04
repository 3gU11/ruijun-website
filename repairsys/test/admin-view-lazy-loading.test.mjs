import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('admin keeps non-default master data and report panels behind asynchronous view boundaries', async () => {
  const [gate, source] = await Promise.all([
    readFile(new URL('src/AdminApp.vue', root), 'utf8'),
    readFile(new URL('src/AdminWorkspace.vue', root), 'utf8')
  ]);

  assert.match(gate, /defineAsyncComponent/);
  assert.match(gate, /import\('\.\/AdminWorkspace\.vue'\)/);
  assert.match(gate, /api\.me\('admin'\)/);
  assert.doesNotMatch(gate, /from '\.\/AdminWorkspace\.vue'/);
  assert.match(source, /initialAdmin/);
  assert.match(source, /defineAsyncComponent/);
  assert.match(source, /import\('\.\/admin\/AdminMasterDataPanel\.vue'\)/);
  assert.match(source, /import\('\.\/admin\/AdminReportsPanel\.vue'\)/);
  assert.match(source, /<AdminMasterDataPanel\s+v-if="activeTab === 'master'"/);
  assert.match(source, /<AdminReportsPanel\s+v-if="activeTab === 'reports'"/);

  for (const file of ['src/admin/AdminMasterDataPanel.vue', 'src/admin/AdminReportsPanel.vue']) {
    const view = await readFile(new URL(file, root), 'utf8');
    assert.match(view, /<template>/);
  }
});
