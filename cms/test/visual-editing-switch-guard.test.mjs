import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { requiresVisualDraftSwitchConfirmation } from '../extensions/content-editor-workbench/src/visual-editing-switch-guard.js';

test('a dirty visual draft requires confirmation only when the canvas changes record identity', () => {
  const current = { collection: 'pages', itemId: 1 };

  assert.equal(requiresVisualDraftSwitchConfirmation({
    hasUnsavedChanges: true,
    currentTarget: current,
    nextTarget: { collection: 'pages', itemId: '1' }
  }), false);
  assert.equal(requiresVisualDraftSwitchConfirmation({
    hasUnsavedChanges: false,
    currentTarget: current,
    nextTarget: { collection: 'milestones', itemId: 3 }
  }), false);
  assert.equal(requiresVisualDraftSwitchConfirmation({
    hasUnsavedChanges: true,
    currentTarget: current,
    nextTarget: { collection: 'pages', itemId: 2 }
  }), true);
  assert.equal(requiresVisualDraftSwitchConfirmation({
    hasUnsavedChanges: true,
    currentTarget: current,
    nextTarget: { collection: 'milestones', itemId: 3 }
  }), true);
});

test('canvas-driven cross-record navigation cannot bypass the unsaved-draft confirmation', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');

  assert.match(module, /requiresVisualDraftSwitchConfirmation/);
  // Collections that keep their drafts on switch skip the prompt (it made a plain
  // card click look destructive); everything else still confirms.
  assert.match(module, /const keepsDraftOnSwitch = new Set\(\['pages', 'homepage_sections', 'product_series', 'product_models'\]\);/);
  assert.match(module, /if \(!discardConfirmed[\s\S]*?&& !keepsDraftOnSwitch\.has\(collection\)[\s\S]*?requiresVisualDraftSwitchConfirmation\(\{[\s\S]*?hasUnsavedChanges: hasUnsavedChanges\.value,[\s\S]*?nextTarget: \{ collection, itemId: resolved\.record\.id \}[\s\S]*?\}\) && !confirmDiscardChanges\('切换画布编辑内容'\)\) return null;/);
  assert.match(module, /function switchVisualPreviewRecord\(itemId\) \{[\s\S]*if \(!confirmDiscardChanges\('切换预览条目'\)\) return false;[\s\S]*activateVisualEditingTarget\([\s\S]*\{ discardConfirmed: true \}\);[\s\S]*return true;/);
});

test('a cancelled preview-record switch restores the select to the actual draft record', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');

  assert.match(module, /@change="handleVisualPreviewRecordChange\(\$event\)"/);
  assert.match(module, /function handleVisualPreviewRecordChange\(event\) \{[\s\S]*const switched = switchVisualPreviewRecord\(event\.target\.value\);[\s\S]*if \(!switched\) event\.target\.value = String\(websitePreviewTarget\.value\?\.record\?\.id \|\| ''\);/);
  assert.match(module, /function switchVisualPreviewRecord\(itemId\) \{[\s\S]*if \(!collection \|\| !nextId \|\| String\(target\?\.record\?\.id \|\| ''\) === nextId\) return false;[\s\S]*if \(!confirmDiscardChanges\('切换预览条目'\)\) return false;[\s\S]*activateVisualEditingTarget\([\s\S]*return true;/);
});
