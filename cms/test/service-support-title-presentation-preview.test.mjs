import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('service support title verifier covers the exact field presentation, preview target, and cleanup', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const script = await readFile(new URL('../scripts/verify-service-support-title-presentation-preview.mjs', import.meta.url), 'utf8');

  assert.equal(packageJson.scripts['visual:verify-service-support-title-presentation'], 'node ./scripts/verify-service-support-title-presentation-preview.mjs');
  assert.match(script, /pageId = '3'/);
  assert.match(script, /sectionId = 'support'/);
  assert.match(script, /support\.title = marker/);
  assert.match(script, /field_presentation\.title/);
  assert.match(script, /sectionKey: sectionId/);
  assert.match(script, /data-cms-preview-key="support"/);
  assert.match(script, /data-cms-preview-position-field-path="field_presentation\.title"/);
  assert.match(script, /restored: true/);
});
