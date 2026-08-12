import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { legacyRedirectFor, legacyRedirectPlugin } from '../legacy-client-redirect.mjs';

test('legacy customer routes map to Nuxt customer routes', () => {
  assert.deepEqual(legacyRedirectFor('/repair/new?model=RJ-1', 'https://example.com'), {
    statusCode: 301,
    location: 'https://example.com/repair/new?model=RJ-1'
  });
  assert.deepEqual(legacyRedirectFor('/warranty?serial=SN-1', 'https://example.com'), {
    statusCode: 301,
    location: 'https://example.com/repair/warranty?serial=SN-1'
  });
  assert.deepEqual(legacyRedirectFor('/requests', 'https://example.com'), {
    statusCode: 301,
    location: 'https://example.com/repair/requests'
  });
});

test('unknown and admin routes are not redirected', () => {
  assert.equal(legacyRedirectFor('/admin', 'https://example.com'), null);
  assert.equal(legacyRedirectFor('/repair/requests/REQ-1', 'https://example.com'), null);
});

test('standalone client config does not redirect customer routes to Nuxt', async () => {
  const config = await readFile(new URL('../vite.client.config.js', import.meta.url), 'utf8');
  assert.doesNotMatch(config, /legacy-client-redirect/);
  assert.doesNotMatch(config, /legacyRedirectPlugin/);
  assert.match(config, /path === '\/repair'/);
});

test('default repairsys build is Admin-only and standalone client build is explicit', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(packageJson.scripts.build, 'npm run build:admin');
  assert.equal(packageJson.scripts['build:client'], 'vite build --config vite.client.config.js');
  assert.equal(packageJson.scripts['dev:client'], 'vite --config vite.client.config.js');
  assert.equal(packageJson.scripts['build:legacy-client'], undefined);
  assert.equal(packageJson.scripts['dev:legacy-client'], undefined);
  assert.match(packageJson.scripts.dev, /dev:admin/);
  assert.doesNotMatch(packageJson.scripts.dev, /dev:client/);
});

test('JSON development storage supports an explicit isolated database path', async () => {
  const store = await readFile(new URL('../server/store.js', import.meta.url), 'utf8');
  assert.match(store, /process\.env\.REPAIR_DB_PATH/);
});
