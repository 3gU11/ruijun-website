import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('first service office region title verifier preserves the next region while rendering one field presentation', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const script = await readFile(new URL('../scripts/verify-service-office-first-region-title-presentation-preview.mjs', import.meta.url), 'utf8');

  assert.equal(packageJson.scripts['visual:verify-service-office-first-region-title-presentation'], 'node ./scripts/verify-service-office-first-region-title-presentation-preview.mjs');
  assert.match(script, /pageId = '3'/);
  assert.match(script, /sectionId = 'office-directory'/);
  assert.match(script, /items\[0\]/);
  assert.match(script, /items\[1\]/);
  assert.match(script, /field_presentation/);
  assert.match(script, /sectionKey: sectionId/);
  assert.match(script, /data-cms-preview-key="office-directory"/);
  assert.match(script, /restored: true/);
});
