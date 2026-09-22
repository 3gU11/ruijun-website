import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('CMS compose baseline keeps Directus, MySQL, and object storage private by default', async () => {
  const compose = await readFile(new URL('compose.yaml', root), 'utf8');
  assert.match(compose, /^services:\s*$/m);
  assert.match(compose, /^  database:\s*$/m);
  assert.match(compose, /^  directus:\s*$/m);
  assert.match(compose, /^  minio:\s*$/m);
  assert.match(compose, /image: mysql:8\.4/);
  assert.match(compose, /image: directus\/directus:11\.7\.2/);
  assert.match(compose, /image: minio\/minio:RELEASE\.2025-04-22T22-12-26Z/);
  assert.match(compose, /127\.0\.0\.1:\$\{DIRECTUS_PORT:-8055\}:8055/);
  assert.doesNotMatch(compose, /^\s*-\s*["']?8055:8055/m);
});

test('CMS environment template requires secrets rather than committing credentials', async () => {
  const environment = await readFile(new URL('.env.example', root), 'utf8');
  for (const key of ['DIRECTUS_KEY', 'DIRECTUS_SECRET', 'DIRECTUS_ADMIN_EMAIL', 'DIRECTUS_ADMIN_PASSWORD', 'MYSQL_PASSWORD', 'MINIO_ROOT_PASSWORD', 'CMS_WEBHOOK_SECRET']) {
    assert.match(environment, new RegExp(`^${key}=<REPLACE_ME>$`, 'm'));
  }
  assert.match(environment, /^WEBSITE_CACHE_INVALIDATION_URL=https:\/\//m);
  assert.match(environment, /^WEBSITE_PREVIEW_OPEN_URL=https:\/\//m);
  assert.match(environment, /^CONTENT_SECURITY_POLICY_DIRECTIVES__CHILD_SRC=.*https:\/\//m);
  assert.match(environment, /^CONTENT_SECURITY_POLICY_DIRECTIVES__FORM_ACTION=.*https:\/\//m);
  assert.match(environment, /^PRODUCT_RELEASE_CACHE_INVALIDATION_TIMEOUT_MS=5000$/m);
});

test('Windows local development template keeps SQLite data and secrets outside version control', async () => {
  const environment = await readFile(new URL('.env.local.example', root), 'utf8');
  const gitignore = await readFile(new URL('.gitignore', root), 'utf8');
  const readme = await readFile(new URL('../docs/modules/CMS本地开发.md', root), 'utf8');

  assert.match(environment, /^DB_CLIENT=sqlite3$/m);
  assert.match(environment, /^DB_FILENAME=\.\/data\/directus\.db$/m);
  assert.match(environment, /^KEY=<REPLACE_ME>$/m);
  assert.match(environment, /^SECRET=<REPLACE_ME>$/m);
  assert.match(environment, /^CMS_WEBHOOK_SECRET=<REPLACE_ME>$/m);
  assert.match(environment, /^WEBSITE_CACHE_INVALIDATION_URL=http:\/\/127\.0\.0\.1:4175\/api\/internal\/v1\/cms\/cache-invalidate$/m);
  assert.match(environment, /^WEBSITE_PREVIEW_OPEN_URL=http:\/\/127\.0\.0\.1:4175\/api\/preview\/open$/m);
  assert.match(environment, /^CONTENT_SECURITY_POLICY_DIRECTIVES__CHILD_SRC=.*http:\/\/127\.0\.0\.1:4175$/m);
  assert.match(environment, /^CONTENT_SECURITY_POLICY_DIRECTIVES__MEDIA_SRC=.*blob:.*http:\/\/127\.0\.0\.1:8055$/m);
  assert.match(environment, /^CONTENT_SECURITY_POLICY_DIRECTIVES__FORM_ACTION=.*http:\/\/127\.0\.0\.1:4175$/m);
  assert.match(gitignore, /^\.env\.local$/m);
  assert.match(gitignore, /^data\/$/m);
  assert.match(readme, /Node\.js 22 LTS/);
  assert.match(readme, /npm install/);
});

test('publication rehearsal is explicitly local-only and cleans temporary records', async () => {
  const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  const script = await readFile(new URL('scripts/verify-content-publication-e2e.mjs', root), 'utf8');
  assert.equal(packageJson.scripts['publication:verify-e2e'], 'node ./scripts/verify-content-publication-e2e.mjs');
  assert.match(script, /RFC1918 HTTP URL/);
  assert.match(script, /e2e-publication-/);
  assert.match(script, /Temporary publication article was not fully cleaned/);
  assert.doesNotMatch(script, /CMS_BFF_TOKEN|CMS_WRITE_TOKEN/);
});

test('CMS demo seed is marked, draft-only, and has a deterministic cleanup command', async () => {
  const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  const script = await readFile(new URL('scripts/seed-cms-demo.mjs', root), 'utf8');
  assert.equal(packageJson.scripts['demo:seed'], 'node ./scripts/seed-cms-demo.mjs');
  assert.equal(packageJson.scripts['demo:cleanup'], 'node ./scripts/seed-cms-demo.mjs --cleanup');
  assert.match(script, /DEMO-CMS-CONTENT/);
  assert.match(script, /DEMO-NOTIFICATION-MANUAL-REVIEW/);
  assert.match(script, /status: 'draft'/);
  assert.match(script, /repair_page_configs/);
  assert.match(script, /page_key: 'repair_home'/);
  assert.match(script, /action: '01'/);
  assert.match(script, /publication_state: 'unpublished'/);
  assert.match(script, /process\.exit\(0\)/);
  assert.match(script, /Delete children first/);
  assert.doesNotMatch(script, /status: 'published'/);
});
