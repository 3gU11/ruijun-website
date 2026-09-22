import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('manufacturing inspection-title verifier covers the exact page field, preview target, and cleanup', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const script = await readFile(new URL('../scripts/verify-manufacturing-inspection-title-preview.mjs', import.meta.url), 'utf8');

  assert.equal(packageJson.scripts['visual:verify-manufacturing-inspection-title'], 'node ./scripts/verify-manufacturing-inspection-title-preview.mjs');
  assert.match(script, /pageId = '8'/);
  assert.match(script, /id === 'whole-machine-validation'/);
  assert.match(script, /\.title = marker/);
  assert.match(script, /const presentation = \{/);
  assert.match(script, /field_presentation = \{ \.\.\.\(inspection\.field_presentation \|\| \{\}\), title: presentation \}/);
  assert.match(script, /assertControlledPresentation\(savedInspection\.field_presentation\?\.title/);
  assert.match(script, /sectionKey: 'whole-machine-validation'/);
  assert.match(script, /data-cms-preview-key="whole-machine-validation"/);
  assert.match(script, /data-cms-preview-position-field-path="field_presentation.title"/);
  assert.match(script, /--size:40/);
  assert.match(script, /restored: true/);
});
