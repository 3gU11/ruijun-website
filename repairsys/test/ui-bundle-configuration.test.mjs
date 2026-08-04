import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('repairsys loads Element Plus components on demand instead of registering the whole library and icon set', async () => {
  const [bootstrap, clientApp, adminApp, clientConfig, adminConfig, packageJson] = await Promise.all([
    readFile(new URL('src/bootstrap.js', root), 'utf8'),
    readFile(new URL('src/ClientApp.vue', root), 'utf8'),
    readFile(new URL('src/AdminApp.vue', root), 'utf8'),
    readFile(new URL('vite.client.config.js', root), 'utf8'),
    readFile(new URL('vite.admin.config.js', root), 'utf8'),
    readFile(new URL('package.json', root), 'utf8')
  ]);

  assert.doesNotMatch(bootstrap, /import ElementPlus from 'element-plus'/);
  assert.doesNotMatch(bootstrap, /import \* as ElementPlusIconsVue/);
  assert.doesNotMatch(bootstrap, /app\.use\(ElementPlus\)/);
  assert.doesNotMatch(bootstrap, /Object\.entries\(ElementPlusIconsVue\)/);
  assert.doesNotMatch(bootstrap, /from 'element-plus';/);
  assert.doesNotMatch(clientApp, /from 'element-plus';/);
  assert.doesNotMatch(adminApp, /from 'element-plus';/);

  for (const config of [clientConfig, adminConfig]) {
    assert.match(config, /unplugin-vue-components\/vite/);
    assert.match(config, /ElementPlusResolver/);
    assert.match(config, /importStyle:\s*'css'/);
    assert.match(config, /Components\(\{\s*resolvers:/);
  }

  assert.match(packageJson, /"unplugin-vue-components"/);
});
