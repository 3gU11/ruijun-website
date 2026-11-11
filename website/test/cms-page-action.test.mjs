import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { CMS_LIVE_PREVIEW_PAGE_ACTION, cmsPageActionFor } from '../utils/cms-live-preview.mjs';

function element(dataset = {}, parent = null) {
  return {
    dataset,
    closest(selector) {
      if (selector !== '[data-cms-preview-page-action]') return null;
      if (dataset.cmsPreviewPageAction) return this;
      return parent ? parent.closest(selector) : null;
    }
  };
}

test('page actions are only produced for marked elements', () => {
  assert.equal(cmsPageActionFor(null), null);
  assert.equal(cmsPageActionFor(element({})), null);
  assert.equal(cmsPageActionFor(element({ cmsPreviewPageAction: '  ' })), null);
});

test('page actions carry the element dataset so the page can identify the target', () => {
  const action = cmsPageActionFor(element({ cmsPreviewPageAction: 'open-product-series', cmsSeriesId: 'ft-xs' }));

  assert.deepEqual(action, {
    action: 'open-product-series',
    dataset: { cmsPreviewPageAction: 'open-product-series', cmsSeriesId: 'ft-xs' }
  });
});

test('page actions resolve from a nested label inside the action button', () => {
  const button = element({ cmsPreviewPageAction: 'select-product-model', cmsModel: 'FR500XS(auto)' });
  const label = element({}, button);

  assert.equal(cmsPageActionFor(label).dataset.cmsModel, 'FR500XS(auto)');
});

test('the page action event name stays stable for the workbench protocol', () => {
  assert.equal(CMS_LIVE_PREVIEW_PAGE_ACTION, 'ruijun:cms-preview:page-action');
});

test('canvas list buttons forward their array path to the workbench', async () => {
  const composable = await readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');

  assert.match(composable, /action === 'list-add' \|\| action === 'list-remove'/);
  assert.match(composable, /listPath: String\(actionElement\.dataset\.cmsListPath \|\| ''\)/);
  assert.match(composable, /listIndex: String\(actionElement\.dataset\.cmsListIndex \|\| ''\)/);
  assert.match(composable, /type: `ruijun:cms-preview:\$\{action\}`/);
  // The owning record travels with the button so a page session can still drive
  // a product-detail list.
  assert.match(composable, /collection: String\(actionElement\.dataset\.cmsListCollection \|\| base\.collection\)/);
  assert.match(composable, /itemId: String\(actionElement\.dataset\.cmsListItemId \|\| base\.itemId\)/);
});

test('canvas parameter buttons forward the model code and record id', async () => {
  const composable = await readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');

  assert.match(composable, /action === 'parameter-add' \|\| action === 'parameter-remove'/);
  assert.match(composable, /modelCode: String\(actionElement\.dataset\.cmsModelCode \|\| ''\)/);
  assert.match(composable, /parameterId: String\(actionElement\.dataset\.cmsParameterId \|\| ''\)/);
});

test('a canvas frame without a session asks the workbench to reopen it', async () => {
  const composable = await readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  const util = await readFile(new URL('../utils/cms-live-preview.mjs', import.meta.url), 'utf8');

  assert.match(util, /export const CMS_LIVE_PREVIEW_SESSION_MISSING = 'ruijun:cms-preview:session-missing';/);
  assert.match(composable, /function insidePreviewFrame\(\) \{/);
  assert.match(composable, /window\.parent !== window/);
  assert.match(composable, /function reportMissingSession\(\) \{/);
  assert.match(composable, /postEditMessage\(\{ type: CMS_LIVE_PREVIEW_SESSION_MISSING \}\)/);
  // Idle canvases lapse after 15 minutes: keep the sliding session alive.
  assert.match(composable, /\$fetch\('\/api\/preview\/session'\)/);
  assert.match(composable, /5 \* 60 \* 1000/);
  assert.match(composable, /watch\(error, \(value\) => \{ if \(value\) reportMissingSession\(\); \}\);/);
});

test('pointer presses on canvas action buttons never start a drag/selection', async () => {
  const composable = await readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');

  // A real click used to be retargeted by pointer capture on the card, so the
  // action branch never ran (synthetic .click() masked it in tests).
  assert.match(composable, /function isCanvasActionTarget\(node: EventTarget \| null\) \{/);
  assert.match(composable, /closest\?\.\('\[data-cms-preview-action\], \[data-cms-preview-page-action\]'\)/);
  assert.match(composable, /if \(isCanvasActionTarget\(event\.target\)\) return;/);
  // A page-declared uninitialized field stays read-only even though it has a path.
  assert.match(composable, /String\(element\.dataset\.cmsPreviewReadonly \|\| ''\)\.trim\(\) === 'uninitialized'/);
});

test('a model chip click reaches both the workbench and the page model switch', async () => {
  const composable = await readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  // The chip must not be swallowed by the generic action guard: the page's own
  // click handler is what changes the displayed model. The workbench message is
  // posted first, then the click is allowed to continue.
  assert.match(composable, /if \(action === 'select-model-target'\) \{[\s\S]*?type: 'ruijun:cms-preview:select-model-target'[\s\S]*?return;\s*\}\s*event\.preventDefault\(\);/);
});

test('canvas delete buttons carry the row label for the confirmation', async () => {
  const composable = await readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(composable, /listLabel: String\(actionElement\.dataset\.cmsListLabel \|\| ''\)/);
});

test('canvas model buttons forward the series code and model id', async () => {
  const composable = await readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(composable, /action === 'model-add' \|\| action === 'model-remove'/);
  assert.match(composable, /modelId: String\(actionElement\.dataset\.cmsModelId \|\| ''\)/);
  assert.match(composable, /modelCode: String\(actionElement\.dataset\.cmsModelCode \|\| ''\)/);
});

test('canvas series card buttons forward the series record id', async () => {
  const composable = await readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(composable, /action === 'series-add' \|\| action === 'series-remove'/);
  assert.match(composable, /seriesRecordId: String\(actionElement\.dataset\.cmsSeriesRecordId \|\| ''\)/);
});
