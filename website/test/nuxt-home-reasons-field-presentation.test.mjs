import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('homepage three-reasons copy exposes independent field presentation controls on the real canvas nodes', async () => {
  const page = await readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');

  assert.match(page, /homepageFieldPresentationPath/);
  assert.match(page, /fieldPresentationAttributes\(reasonsHeading, 'title'\)/);
  assert.match(page, /data-cms-preview-position-field-path="field_presentation\.title"/);

  for (const field of ['introTitle', 'introDetail', 'shortTitle', 'body', 'title']) {
    assert.match(page, new RegExp(`fieldPresentationAttributes\\((?:reason|tab), '${field}'\\)`));
    assert.match(page, new RegExp(`homepageFieldPresentationPath\\((?:reason|tab)\\.cmsBinding, '${field}'\\)`));
  }
});

test('homepage reason images expose governed media placements on their rendered canvas nodes', async () => {
  const source = await readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');
  assert.match(source, /:data-cms-preview-placement-key="reason\.mode === 'machine' \? 'home\.reason\.machine' : 'home\.reason\.background'"/);
});
import assert from 'node:assert/strict';
