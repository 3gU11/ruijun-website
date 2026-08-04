import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('Nuxt BFF configuration uses a dedicated private service token rather than the legacy CMS write token', async () => {
  const config = await readFile(new URL('nuxt.config.ts', root), 'utf8');
  const readme = await readFile(new URL('../docs/modules/Nuxt官网安全配置说明.md', root), 'utf8');
  const sources = await Promise.all([
    'server/api/public/v1/navigation.get.ts',
    'server/utils/cms-article-reader.ts',
    'server/api/public/v1/leads.post.ts',
    'server/api/public/v1/pages/[slug].get.ts',
    'server/utils/cms-product-reader.ts'
  ].map((file) => readFile(new URL(file, root), 'utf8')));

  assert.match(config, /cmsBffToken: process\.env\.CMS_BFF_TOKEN \|\| ''/);
  assert.match(config, /cmsMediaAssetsUrl: process\.env\.CMS_MEDIA_ASSETS_URL \|\| ''/);
  assert.match(config, /cmsPublicAssetBaseUrl: process\.env\.CMS_PUBLIC_ASSET_BASE_URL \|\| ''/);
  assert.doesNotMatch(config, /public:\s*\{[^}]*cmsMediaAssetsUrl/s);
  assert.match(config, /buildDir: process\.env\.NUXT_BUILD_DIR \|\| '\.nuxt'/);
  assert.doesNotMatch(config, /cmsWriteToken:/);
  assert.ok(sources.every((source) => source.includes('config.cmsBffToken')));
  assert.ok(sources.every((source) => !source.includes('config.cmsWriteToken')));
  assert.match(readme, /CMS_BFF_TOKEN/);
  assert.match(readme, /CMS_WEBHOOK_SECRET/);
  assert.doesNotMatch(readme, /CMS_WRITE_TOKEN/);
});
