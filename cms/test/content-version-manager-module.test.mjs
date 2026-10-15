import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('content version manager is a Directus module that uses only the protected version endpoint', async () => {
  const [manifestText, index, module] = await Promise.all([
    readFile(new URL('extensions/content-version-manager/package.json', root), 'utf8'),
    readFile(new URL('extensions/content-version-manager/src/index.js', root), 'utf8'),
    readFile(new URL('extensions/content-version-manager/src/module.vue', root), 'utf8')
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest['directus:extension'].type, 'module');
  assert.equal(manifest['directus:extension'].source, 'src/index.js');
  assert.match(index, /id:\s*'ruijun-content-version-manager'/);
  assert.match(module, /useApi/);
  assert.match(module, /content-version-restore/);
  assert.match(module, /查看与当前内容差异/);
  assert.match(module, /diffFields/);
  assert.match(module, /restoreNote/);
  assert.doesNotMatch(module, /CMS_BFF_TOKEN|CMS_WRITE_TOKEN/);
});

test('version manager asks for confirmation before discarding newer changes', async () => {
  const module = await readFile(new URL('extensions/content-version-manager/src/module.vue', root), 'utf8');
  // The restore endpoint answers 409 when newer versions exist. The operator
  // must acknowledge the loss instead of the UI failing or overwriting silently.
  assert.match(module, /function newerVersionCount\(reason\)/);
  assert.match(module, /extensions\?\.code === 'NEWER_VERSIONS_EXIST'/);
  assert.match(module, /window\.confirm\(`该版本之后还有 \$\{newer\} 次改动，恢复会一并丢弃。确定继续吗？`\)/);
  assert.match(module, /confirmDiscardNewer: true/);
  assert.match(module, /已取消恢复，内容未被修改。/);
  assert.match(module, /discardedNewerVersions/);
});
