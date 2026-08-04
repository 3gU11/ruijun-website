import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const catalogUrl = new URL('../../demo/data/product-catalog.json', import.meta.url);
const { buildLegacyProductDraftImport } = await import('../import/legacy-product-catalog.mjs');

async function readCatalog() {
  return JSON.parse(await readFile(catalogUrl, 'utf8'));
}

test('legacy catalog imports every series and model as a non-public draft', async () => {
  const payload = buildLegacyProductDraftImport(await readCatalog());

  assert.equal(payload.product_series.length, 7);
  assert.equal(payload.product_models.length, 29);
  for (const record of [...payload.product_series, ...payload.product_models]) {
    assert.equal(record.status, 'draft');
    assert.equal(record.publication_state, 'unpublished');
    assert.ok(record.review_note);
  }
});

test('legacy catalog import retains source evidence and flags conflicts for review', async () => {
  const payload = buildLegacyProductDraftImport(await readCatalog());
  const automatic = payload.product_models.find((model) => model.model_code === 'fr400xs-auto');
  const unmapped = payload.product_models.find((model) => model.model_code === 'ft400s-pro');

  assert.equal(automatic.source_url, 'http://www.ksrjjx.com/proshow__2129.html');
  assert.match(automatic.source_document, /FR400XS/);
  assert.deepEqual(automatic.import_evidence.parameter_conflicts, ['maxWorkpieceMm']);
  assert.equal(unmapped.import_evidence.series_mapping_status, 'needs_product_owner_confirmation');
  assert.match(unmapped.review_note, /审核/);
});

test('legacy catalog import does not convert unresolved aliases into public product names', async () => {
  const payload = buildLegacyProductDraftImport(await readCatalog());
  const ftSeries = payload.product_series.find((series) => series.series_code === 'ft-xs');

  assert.deepEqual(ftSeries.import_evidence.aliases_pending_review, ['FT（Pro）']);
  assert.equal(ftSeries.name, 'FT-XS');
  assert.match(ftSeries.review_note, /别名/);
});
