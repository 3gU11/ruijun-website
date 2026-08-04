import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('Nuxt inquiry dialog submits only the public lead contract and exposes accessible status feedback', async () => {
  const source = await readFile(new URL('components/LeadInquiryDialog.vue', root), 'utf8');

  assert.match(source, /<dialog/);
  assert.match(source, /name="name"/);
  assert.match(source, /name="phone"/);
  assert.match(source, /name="leadType"/);
  assert.match(source, /name="consent"/);
  assert.match(source, /name="attachments"/);
  assert.match(source, /type="file"/);
  assert.match(source, /\/api\/public\/v1\/lead-attachments/);
  assert.match(source, /attachmentReferences/);
  assert.match(source, /role="status"/);
  assert.match(source, /fetch\('\/api\/public\/v1\/leads'/);
  assert.match(source, /pagePath: route\.path/);
  assert.doesNotMatch(source, /CMS_BFF_TOKEN|DIRECTUS|CMS_WRITE_TOKEN/);
});

test('Nuxt homepage exposes the inquiry dialog from a conversion CTA', async () => {
  const source = await readFile(new URL('pages/index.vue', root), 'utf8');

  assert.match(source, /LeadInquiryDialog/);
  assert.match(source, /openInquiry/);
  assert.match(source, /获取选型建议/);
});
