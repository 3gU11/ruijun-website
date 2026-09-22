import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('service action-card verifier preserves adjacent cards while rendering one title presentation', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const script = await readFile(new URL('../scripts/verify-service-action-card-title-presentation-preview.mjs', import.meta.url), 'utf8');

  assert.equal(packageJson.scripts['visual:verify-service-action-card-title-presentation'], 'node ./scripts/verify-service-action-card-title-presentation-preview.mjs');
  assert.match(script, /pageId = '3'/);
  assert.match(script, /sectionId = 'support-actions'/);
  assert.match(script, /items\[0\]/);
  assert.match(script, /items\[1\]/);
  assert.match(script, /field_presentation/);
  assert.match(script, /sectionKey: sectionId/);
  assert.match(script, /data-cms-preview-key="support-actions"/);
  assert.match(script, /restored: true/);
});
