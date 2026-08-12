import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('notification manager demo and E2E scripts are local-only and keep secrets out of output paths', async () => {
  const [e2e, seed, packageText] = await Promise.all([
    readFile(new URL('../scripts/verify-notification-manager-e2e.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../scripts/seed-cms-demo.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../package.json', import.meta.url), 'utf8')
  ]);
  const packageJson = JSON.parse(packageText);
  assert.equal(packageJson.scripts['notifications:verify-e2e'], 'node ./scripts/verify-notification-manager-e2e.mjs');
  assert.equal(packageJson.scripts['demo:seed'], 'node ./scripts/seed-cms-demo.mjs');
  assert.match(e2e, /通知管理员/);
  assert.match(e2e, /manual_review/);
  assert.match(e2e, /lock_token/);
  assert.match(e2e, /items\/leads/);
  assert.match(seed, /isLocalOrPrivateHost/);
  assert.match(seed, /DEMO-NOTIFICATION-MANUAL-REVIEW/);
  const logStatements = seed.split(/\r?\n/).filter((line) => line.includes('console.log')).join('\n');
  assert.doesNotMatch(logStatements, /CMS_NOTIFICATION_WORKER_TOKEN|CMS_BFF_TOKEN|ADMIN_PASSWORD|access_token/);
});
