import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { normalizeLocalCmsBaseUrl, probeBuiltExtensions, verifyLocalCmsRuntime } from '../scripts/verify-local-cms-runtime.mjs';

test('local CMS runtime verification only accepts a loopback Directus endpoint', () => {
  assert.equal(normalizeLocalCmsBaseUrl('http://127.0.0.1:8055/'), 'http://127.0.0.1:8055');
  assert.equal(normalizeLocalCmsBaseUrl('http://[::1]:8055'), 'http://[::1]:8055');
  assert.throws(() => normalizeLocalCmsBaseUrl('https://cms.example.com'), /loopback/i);
  assert.throws(() => normalizeLocalCmsBaseUrl('not a url'), /valid HTTP URL/i);
});

test('local CMS runtime verification reports native dependencies, health, and built extensions without secrets', async () => {
  const result = await verifyLocalCmsRuntime({
    baseUrl: 'http://127.0.0.1:8055',
    fetchImpl: async (url) => {
      assert.equal(url, 'http://127.0.0.1:8055/server/health');
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
    },
    nativeProbe: (name) => ({ name, loaded: true }),
    extensionProbe: async () => ([
      { name: 'service-entry-analytics', built: true },
      { name: 'lead-workbench', built: false }
    ])
  });

  assert.deepEqual(result, {
    runtime: {
      nodeMajor: Number(process.versions.node.split('.')[0]),
      supported: Number(process.versions.node.split('.')[0]) === 22
    },
    nativeModules: [
      { name: 'sqlite3', loaded: true },
      { name: 'isolated-vm', loaded: true }
    ],
    directus: { healthy: true, status: 200 },
    extensions: { total: 2, built: 1, missingBuild: ['lead-workbench'] },
    ready: false
  });
  assert.equal(JSON.stringify(result).includes('TOKEN'), false);
  assert.equal(JSON.stringify(result).includes('PASSWORD'), false);
});

test('local CMS runtime verification remains read-only when Directus is unavailable', async () => {
  const result = await verifyLocalCmsRuntime({
    baseUrl: 'http://localhost:8055',
    fetchImpl: async () => { throw new Error('connection refused'); },
    nativeProbe: (name) => ({ name, loaded: name === 'sqlite3' }),
    extensionProbe: async () => ([])
  });

  assert.deepEqual(result.directus, { healthy: false, status: null });
  assert.equal(result.ready, false);
});

test('local CMS runtime verification ignores directories without a Directus extension manifest', async () => {
  const extensions = await probeBuiltExtensions();

  assert.equal(extensions.some((extension) => extension.name === 'media-asset-governance'), false);
  assert.equal(extensions.every((extension) => typeof extension.built === 'boolean'), true);
});

test('the local Directus launcher resolves extensions from the CMS directory', async () => {
  const launcher = await readFile(new URL('../.codex-start-node22.ps1', import.meta.url), 'utf8');

  assert.match(launcher, /Set-Location -LiteralPath \$PSScriptRoot/);
  assert.match(launcher, /directus\\cli\.js' start/);
});
