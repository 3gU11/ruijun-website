import assert from 'node:assert/strict';
import test from 'node:test';
import { setVisualTextStyle } from '../extensions/content-editor-workbench/src/visual-editing-text-style.js';

test('text style is applied to the selected repeated item instead of the whole section', () => {
  const section = { items: [{ title: '标题', text_style: { enabled: true, weight: 400, size_desktop: 0 } }], text_style: { enabled: true, weight: 400, size_desktop: 0 } };
  assert.equal(setVisualTextStyle(section, 'items.0.title', { fontSize: 48, fontWeight: '700' }), true);
  assert.deepEqual(section.items[0].text_style, { enabled: true, weight: 700, size_desktop: 48 });
  assert.deepEqual(section.text_style, { enabled: true, weight: 400, size_desktop: 0 });
});

test('text style values are bounded and invalid paths do not mutate the record', () => {
  const section = { title: '标题' };
  assert.equal(setVisualTextStyle(section, 'title', { fontSize: 160, fontWeight: '900' }), true);
  assert.equal(section.text_style.size_desktop, 120);
  assert.equal(section.text_style.weight, 800);
  const before = JSON.stringify(section);
  assert.equal(setVisualTextStyle(section, 'missing.0.title', { fontSize: 32, fontWeight: '500' }), false);
  assert.equal(JSON.stringify(section), before);
});

test('editing text style enables the controlled text presentation group', () => {
  const section = { title: '标题' };
  assert.equal(setVisualTextStyle(section, 'title', { fontSize: 42, fontWeight: 700 }), true);
  assert.equal(section.text_style.enabled, true);
});

test('scalar section fields retain independent text styles when a field presentation path is selected', () => {
  const section = { title: '标题', body: '正文', text_style: { enabled: true, weight: 400, size_desktop: 18 } };
  assert.equal(setVisualTextStyle(section, 'field_presentation.title', { fontSize: 48, fontWeight: 700 }), true);
  assert.deepEqual(section.field_presentation.title.text_style, { enabled: true, weight: 700, size_desktop: 48 });
  assert.deepEqual(section.text_style, { enabled: true, weight: 400, size_desktop: 18 });
  assert.equal(section.field_presentation.body, undefined);
});

test('nested section content fields retain their own controlled text presentation', () => {
  const section = { content: { online_title: '在线售后服务' } };
  assert.equal(setVisualTextStyle(section, 'field_presentation.content_online_title', { fontSize: 36, fontWeight: 700 }), true);
  assert.deepEqual(section.field_presentation.content_online_title.text_style, { enabled: true, weight: 700, size_desktop: 36 });
  assert.equal(section.content.text_style, undefined);
});

test('product series card copy stores typography in the dedicated presentation field', () => {
  const series = { name: 'FR-XS', positioning: '精密切割' };
  assert.equal(setVisualTextStyle(series, 'presentation.field_presentation.positioning', { fontSize: 26, fontWeight: 700, textColor: '#124578' }), true);
  assert.deepEqual(series.presentation.field_presentation.positioning.text_style, { enabled: true, weight: 700, size_desktop: 26, color: '#124578' });
  assert.equal(series.presentation.field_presentation.name, undefined);
});
