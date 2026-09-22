import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('third service region contact verifier preserves sibling contact fields and renders all contact bindings', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const script = await readFile(new URL('../scripts/verify-service-office-third-region-contact-preview.mjs', import.meta.url), 'utf8');

  assert.equal(packageJson.scripts['visual:verify-service-office-third-region-contact'], 'node ./scripts/verify-service-office-third-region-contact-preview.mjs');
  assert.match(script, /pageId = '3'/);
  assert.match(script, /items\[2\]\.offices\[0\]\.address = addressMarker/);
  assert.match(script, /items\[2\]\.offices\[0\]\.manager = managerMarker/);
  assert.match(script, /items\[2\]\.offices\[0\]\.phone = phoneMarker/);
  assert.match(script, /siblingOffice = clone\(offices\[1\]\)/);
  assert.match(script, /regionContacts\([^\n]+\)\[1\], siblingOffice/);
  assert.match(script, /data-cms-preview-field-path="items\.2\.offices\.0\.address"/);
  assert.match(script, /data-cms-preview-field-path="items\.2\.offices\.0\.manager"/);
  assert.match(script, /data-cms-preview-field-path="items\.2\.offices\.0\.phone"/);
  assert.match(script, /restored: true/);
});
