import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('homepage reason verifier changes one intro title presentation without affecting its sibling reason', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const script = await readFile(new URL('../scripts/verify-homepage-reason-intro-title-presentation-preview.mjs', import.meta.url), 'utf8');

  assert.equal(packageJson.scripts['visual:verify-homepage-reason-intro-title-presentation'], 'node ./scripts/verify-homepage-reason-intro-title-presentation-preview.mjs');
  assert.match(script, /VISUAL_SECTION_ID \|\| 'performance'/);
  assert.match(script, /VISUAL_SIBLING_SECTION_ID \|\| 'advanced-manufacturing'/);
  assert.match(script, /VISUAL_FIELD \|\| 'introTitle'/);
  assert.match(script, /VISUAL_SECTION_ID/);
  assert.match(script, /VISUAL_FIELD/);
  assert.match(script, /field_presentation/);
  assert.match(script, /sectionKey: sectionId/);
  assert.match(script, /data-cms-preview-position-field-path="field_presentation\.\$\{field\}"/);
  assert.match(script, /restored: true/);
});
