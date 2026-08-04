import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createSessionToken, nextSessionVersion, sessionVersionMatches, verifySessionToken } from '../server/security.js';

process.env.AUTH_SECRET = 'test-auth-secret-for-session-version-tests';

test('embeds the account session version in newly issued tokens', () => {
  const token = createSessionToken({ id: 'client-1', userType: 'client', sessionVersion: 4 });
  const payload = verifySessionToken(token);

  assert.equal(payload?.sv, 4);
  assert.equal(sessionVersionMatches(payload, { sessionVersion: 4 }), true);
  assert.equal(sessionVersionMatches(payload, { sessionVersion: 5 }), false);
});

test('allows legacy version-zero sessions and advances invalidation versions monotonically', () => {
  assert.equal(sessionVersionMatches({ sub: 'client-1' }, {}), true);
  assert.equal(nextSessionVersion(undefined), 1);
  assert.equal(nextSessionVersion(0), 1);
  assert.equal(nextSessionVersion(7), 8);
  assert.equal(nextSessionVersion('invalid'), 1);
});

test('wires session version checks, invalidation, and persistence into the repair system', async () => {
  const root = new URL('../', import.meta.url);
  const [server, store, api, client, admin] = await Promise.all([
    readFile(new URL('server/index.js', root), 'utf8'),
    readFile(new URL('server/store.js', root), 'utf8'),
    readFile(new URL('src/api.js', root), 'utf8'),
    readFile(new URL('src/ClientApp.vue', root), 'utf8'),
    readFile(new URL('src/AdminWorkspace.vue', root), 'utf8')
  ]);

  assert.match(server, /sessionVersionMatches\(payload, item\)/);
  assert.match(server, /app\.post\('\/api\/auth\/logout-all'/);
  assert.match(server, /user\.sessionVersion = nextSessionVersion\(user\.sessionVersion\)/);
  assert.match(store, /session_version INT NOT NULL DEFAULT 0/);
  assert.match(store, /sessionVersion: Number\(row\.session_version \|\| 0\)/);
  assert.match(api, /logoutAll:/);
  assert.match(client, /api\.logoutAll\(\)/);
  assert.match(admin, /api\.logoutAll\(\)/);
});
