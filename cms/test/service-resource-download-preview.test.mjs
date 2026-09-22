import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('service resource download verifier covers upload, protected preview, and cleanup', async () => {
  const scriptPath = new URL('../scripts/verify-service-resource-download-preview.mjs', import.meta.url);
  const source = await readFile(scriptPath, 'utf8');
  assert.match(source, /service_resources/);
  assert.match(source, /application\/pdf/);
  assert.match(source, /api\/preview\/media/);
  assert.match(source, /restored/);
  assert.match(source, /KEEP_SERVICE_RESOURCE/);
  assert.doesNotMatch(source, /previewToken:\s*token\.data\.token/);
  assert.match(source, /previewTokenIssued:\s*true/);
});
