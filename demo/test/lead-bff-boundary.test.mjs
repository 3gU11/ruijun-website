import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('Demo documents and enforces the Nuxt BFF-only lead boundary', async () => {
  const [server, readme] = await Promise.all([
    readFile(new URL('server.mjs', root), 'utf8'),
    readFile(new URL('README.md', root), 'utf8')
  ]);

  assert.match(server, /WEBSITE_BFF_BASE_URL/);
  assert.match(server, /createWebsiteBffLeadClient/);
  assert.doesNotMatch(server, /CMS_WRITE_TOKEN|sales-leads\.jsonl|cms-lead-store/);
  assert.match(readme, /WEBSITE_BFF_BASE_URL/);
  assert.doesNotMatch(readme, /CMS_WRITE_TOKEN/);
});
