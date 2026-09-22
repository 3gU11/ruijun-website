import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { setVisualAlignment } from '../extensions/content-editor-workbench/src/visual-editing-layout.js';
import { canEditVisualCanvas } from '../extensions/content-editor-workbench/src/visual-editing-viewport.js';

test('alignment is stored on the selected repeated item for every collection type', () => {
  const record = { items: [{ title: '标题', layout: { align_x: 'left' } }] };
  assert.equal(setVisualAlignment(record, 'items.0.title', 'center'), true);
  assert.equal(record.items[0].layout.align_x, 'center');
});

test('alignment rejects unsupported values and unsafe paths', () => {
  const record = { title: '标题' };
  assert.equal(setVisualAlignment(record, 'title', 'bottom'), false);
  assert.equal(setVisualAlignment(record, 'items.0.__proto__.title', 'right'), false);
  assert.deepEqual(record, { title: '标题' });
});

test('editing alignment enables the controlled layout presentation group', () => {
  const record = { title: '标题' };
  assert.equal(setVisualAlignment(record, 'title', 'center'), true);
  assert.equal(record.layout.enabled, true);
});

test('in-flow live preview keeps a positioning context for its absolute canvas', async () => {
  const moduleSource = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(
    moduleSource,
    /live-website-preview\{position:relative!important;top:auto!important;right:auto!important;bottom:auto!important;left:auto!important;grid-column:2;grid-row:5/,
  );
});

test('medium desktop stacks the live preview after the form so its property panel cannot intercept form actions', async () => {
  const moduleSource = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(
    moduleSource,
    /@media\(min-width:1280px\) and \(max-width:1599px\)\{[\s\S]*?grid-template-columns:176px minmax\(0,1fr\);[\s\S]*?\.live-website-preview\{position:relative!important;[\s\S]*?grid-column:2;grid-row:5/,
  );
  assert.doesNotMatch(
    moduleSource,
    /At this width[\s\S]*?\.editor-page\.live-website-preview-active>section:not\(\.editor-guide\),[\s\S]*?display:none!important/,
  );
});

test('medium desktop constrains the live-preview editor form track so save actions stay inside the viewport', async () => {
  const moduleSource = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(
    moduleSource,
    /\.editor-page\.live-website-preview-active \.editor-form\{[^}]*grid-template-columns:minmax\(0,1fr\)/,
  );
});

test('live preview grid item is bounded so the canvas cannot cover the workbench', async () => {
  const moduleSource = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(
    moduleSource,
    /\.editor-page\.live-website-preview-active\{[\s\S]*?box-sizing:\s*border-box;[\s\S]*?min-width:\s*0;/,
  );
  assert.match(
    moduleSource,
    /\.live-website-preview\{[^}]*min-width:\s*0[^}]*max-width:\s*100%/,
  );
});

test('mobile live preview overrides the desktop canvas width so read-only preview does not scroll horizontally', async () => {
  const moduleSource = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(
    moduleSource,
    /@media\(max-width:720px\)[\s\S]*?visual-canvas-viewport[^}]*iframe\{[\s\S]*?width:100%!important;[\s\S]*?transform:none!important/,
  );
});

test('narrow workbench viewports force the visual canvas into read-only mode', () => {
  assert.equal(canEditVisualCanvas({ device: 'desktop', viewportWidth: 390 }), false);
  assert.equal(canEditVisualCanvas({ device: 'desktop', viewportWidth: 720 }), false);
  assert.equal(canEditVisualCanvas({ device: 'desktop', viewportWidth: 721 }), true);
  assert.equal(canEditVisualCanvas({ device: 'mobile', viewportWidth: 1440 }), false);
});
