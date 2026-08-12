import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('website and demo assets do not share a Nitro public mount', async () => {
  const config = await readFile(new URL('../nuxt.config.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(config, /publicAssets\s*:/);
});

test('the build copies demo assets into the website public directory', async () => {
  const script = await readFile(new URL('../scripts/sync-demo-assets.mjs', import.meta.url), 'utf8');
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(script, /demo\/assets/);
  assert.match(script, /public\/assets/);
  assert.match(packageJson.scripts.prebuild, /sync-demo-assets/);
});
