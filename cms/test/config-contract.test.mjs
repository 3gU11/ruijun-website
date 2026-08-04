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
  for (const key of ['DIRECTUS_KEY', 'DIRECTUS_SECRET', 'DIRECTUS_ADMIN_EMAIL', 'DIRECTUS_ADMIN_PASSWORD', 'MYSQL_PASSWORD', 'MINIO_ROOT_PASSWORD']) {
    assert.match(environment, new RegExp(`^${key}=<REPLACE_ME>$`, 'm'));
  }
});

test('Windows local development template keeps SQLite data and secrets outside version control', async () => {
  const environment = await readFile(new URL('.env.local.example', root), 'utf8');
  const gitignore = await readFile(new URL('.gitignore', root), 'utf8');
  const readme = await readFile(new URL('../docs/modules/CMS本地开发.md', root), 'utf8');

  assert.match(environment, /^DB_CLIENT=sqlite3$/m);
  assert.match(environment, /^DB_FILENAME=\.\/data\/directus\.db$/m);
  assert.match(environment, /^KEY=<REPLACE_ME>$/m);
  assert.match(environment, /^SECRET=<REPLACE_ME>$/m);
  assert.match(gitignore, /^\.env\.local$/m);
  assert.match(gitignore, /^data\/$/m);
  assert.match(readme, /Node\.js 22 LTS/);
  assert.match(readme, /npm install/);
});
