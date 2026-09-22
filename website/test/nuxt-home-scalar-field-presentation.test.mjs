import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('homepage product and timeline copy expose independent field presentation controls on their real sections', async () => {
  const page = await readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');

  assert.match(page, /<section id="products"[^>]*v-bind="sectionPresentationAttributes\(productsSection\)"/);
  for (const field of ['kicker', 'title']) {
    assert.match(page, new RegExp(`fieldPresentationAttributes\\(productsSection, '${field}'\\)`));
    assert.match(page, new RegExp(`data-cms-preview-position-field-path="field_presentation\\.${field}"`));
  }
  for (const field of ['kicker', 'title', 'label']) {
    assert.match(page, new RegExp(`fieldPresentationAttributes\\(historySection, '${field}'\\)`));
    assert.match(page, new RegExp(`data-cms-preview-position-field-path="field_presentation\\.${field}"`));
  }
});

test('homepage product-task kicker is a bound canvas field instead of hard-coded copy', async () => {
  const page = await readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');

  assert.match(page, /fieldPresentationAttributes\(productTask, 'kicker'\)/);
  assert.match(page, /data-cms-preview-field="kicker"/);
  assert.match(page, /data-cms-preview-field-path="kicker"/);
  assert.match(page, /data-cms-preview-position-field-path="field_presentation\.kicker"/);
  assert.match(page, /productTask\.kicker \|\| 'RUIJUN MEDIUM SPEED WIRE EDM'/);
});
