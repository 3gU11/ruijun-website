import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('about chapter headings expose independent controlled field presentation paths', async () => {
  const page = await readFile(new URL('../pages/about.vue', import.meta.url), 'utf8');

  assert.match(page, /import \{ fieldPresentationAttributes, sectionPresentationAttributes \} from '~\/shared\/section-presentation\.mjs'/);
  for (const section of ['factoryContent', 'certificatesContent', 'honorContent', 'patentContent', 'partnersContent', 'domesticClientsContent', 'globalClientsContent']) {
    assert.match(page, new RegExp(`fieldPresentationAttributes\\(${section}, 'title'\\)`));
  }
  for (const section of ['factoryContent', 'certificatesContent', 'honorContent', 'patentContent', 'partnersContent', 'domesticClientsContent']) {
    assert.match(page, new RegExp(`fieldPresentationAttributes\\(${section}, 'kicker'\\)`));
  }
  assert.match(page, /data-cms-preview-position-field-path="field_presentation\.title"/);
  assert.match(page, /data-cms-preview-position-field-path="field_presentation\.kicker"/);
  assert.match(page, /fieldPresentationAttributes\(patentContent, 'description'\)/);
});
