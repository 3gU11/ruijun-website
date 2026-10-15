import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('homepage section dirty state and cancel restore the detached draft, not the page or loaded record', async () => {
  const source = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  const stateFunction = source.slice(source.indexOf('function currentDraftState()'), source.indexOf('function currentDraftFingerprint()'));
  const applyFunction = source.slice(source.indexOf('function applyVisualState(snapshot)'), source.indexOf('function undoVisualChange()'));
  const loaded = { id: 7, media: [{ role: 'background', media_asset_id: '90' }] };
  const homepageSectionDraft = { value: structuredClone(loaded) };
  const pageDraft = { value: { id: 1, sections: [] } };
  const activeTab = { value: 'homepage_sections' };
  let updates = 0;
  const harness = new Function('activeTab', 'homepageSectionDraft', 'pageDraft', 'queueLivePreviewUpdate', 'nextTick', `
    let suppressDraftHistory = false;
    ${stateFunction}
    ${applyFunction}
    return { currentDraftState, applyVisualState };
  `)(activeTab, homepageSectionDraft, pageDraft, () => updates++, (callback) => callback());
  const baseline = structuredClone(harness.currentDraftState());
  homepageSectionDraft.value.media[0].media_asset_id = '91';
  assert.notEqual(JSON.stringify(harness.currentDraftState()), JSON.stringify(baseline));
  assert.deepEqual(loaded, baseline);
  harness.applyVisualState(baseline);
  assert.deepEqual(harness.currentDraftState(), loaded);
  assert.deepEqual(pageDraft.value, { id: 1, sections: [] });
  assert.equal(updates, 1);
});
