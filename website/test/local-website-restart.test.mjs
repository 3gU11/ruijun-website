import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const launcher = new URL('../scripts/restart-local-website.ps1', import.meta.url);

test('local Nuxt restart invokes the supported nuxi dev entrypoint', async () => {
  const script = await readFile(launcher, 'utf8');

  assert.match(script, /node_modules\\@nuxt\\cli\\bin\\nuxi\.mjs/);
  assert.match(script, /'dev'/);
  assert.doesNotMatch(script, /node_modules\\@nuxt\\cli\\dist\\dev\\index\.mjs/);
});
