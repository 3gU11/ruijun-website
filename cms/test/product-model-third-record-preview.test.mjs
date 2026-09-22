import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('third heavy-duty model verifier preserves adjacent model records while previewing its visual feature', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const script = await readFile(new URL('../scripts/verify-product-model-third-record-preview.mjs', import.meta.url), 'utf8');

  assert.equal(packageJson.scripts['visual:verify-product-model-third-record'], 'node ./scripts/verify-product-model-third-record-preview.mjs');
  assert.match(script, /modelId = '17'/);
  assert.match(script, /const featureIndex = 0/);
  assert.match(script, /configuration\.features\[featureIndex\]\.label = marker/);
  assert.match(script, /presentation\.field_presentation\.model_code/);
  assert.match(script, /size_desktop: 24/);
  assert.match(script, /preview session omitted the model-code presentation/);
  assert.match(script, /presentation\.field_presentation\.model_code/);
  assert.match(script, /modelId: 15/);
  assert.match(script, /modelId: 16/);
  assert.match(script, /contentCollection: 'product_models'/);
  assert.match(script, /const renderedFieldPath = `configuration\.features\.\$\{featureIndex\}\.label`/);
  assert.match(script, /previewHtml\.includes\(`data-cms-preview-field-path="\$\{renderedFieldPath\}"`\)/);
  assert.match(script, /restored: true/);
});

test('automatic-threading model detail verifier covers a separate visible detail field and restores it', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const script = await readFile(new URL('../scripts/verify-product-model-auto-detail-preview.mjs', import.meta.url), 'utf8');

  assert.equal(packageJson.scripts['visual:verify-product-model-auto-detail'], 'node ./scripts/verify-product-model-auto-detail-preview.mjs');
  assert.match(script, /const modelId = '1'/);
  assert.match(script, /const adjacentModelId = '2'/);
  assert.match(script, /const featureIndex = 1/);
  assert.match(script, /const field = 'detail'/);
  assert.match(script, /configuration\.features\[featureIndex\]\[field\] = marker/);
  assert.match(script, /features_\$\{featureIndex\}_\$\{field\}/);
  assert.match(script, /previewHtml\.includes\(marker\)/);
  assert.match(script, /restored: true/);
});
