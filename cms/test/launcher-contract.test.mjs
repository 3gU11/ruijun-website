import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const launcher = new URL('../../启动CMS官网维修系统.ps1', import.meta.url);

test('main launcher starts infrastructure before Directus and checks real health endpoints', async () => {
  const script = await readFile(launcher, 'utf8');
  const mysqlStart = script.indexOf("Start-IfStopped -Name 'MySQL'");
  const minioStart = script.indexOf("Start-IfStopped -Name 'MinIO'");
  const directusStart = script.indexOf("Start-IfStopped -Name 'CMS (Directus)'");

  assert.ok(mysqlStart >= 0 && minioStart > mysqlStart && directusStart > minioStart);
  assert.match(script, /mysqladmin\.exe/);
  assert.match(script, /ping --silent/);
  assert.match(script, /\/minio\/health\/ready/);
  assert.match(script, /CMS startup stopped because MySQL is unavailable/);
  assert.match(script, /CMS startup stopped because MinIO is unavailable/);
  assert.match(script, /content-editor-workbench/);
  assert.match(script, /LastWriteTimeUtc/);
  assert.match(script, /run build/);
  assert.match(script, /Reloading.*Directus/);
  assert.match(script, /-WindowStyle Hidden/);
  assert.match(script, /RedirectStandardOutput/);
  assert.match(script, /\$repairAdminReady = Wait-Service -Name 'Repair Admin'.*-TimeoutSeconds 30/s);
  assert.match(script, /\$repairClientReady = Wait-Service -Name 'Repair Client'.*-TimeoutSeconds 30/s);
  assert.match(script, /\$repairAdminReady/);
  assert.match(script, /\$repairClientReady/);
});

test('main launcher clears an orphaned Nuxt development lock before starting the website', async () => {
  const script = await readFile(launcher, 'utf8');

  assert.match(script, /function Clear-StaleNuxtDevLock/);
  assert.match(script, /nuxt\.lock/);
  assert.match(script, /Nuxt dev lock is still owned by a live process/);
  assert.match(script, /Clear-StaleNuxtDevLock -WebsiteRoot \$websiteRoot/);
  assert.match(script, /Start-IfStopped -Name 'Website \(Nuxt\)'/);
});
