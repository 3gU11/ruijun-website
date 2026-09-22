import assert from 'node:assert/strict';
import test from 'node:test';
import { applyVisualPositionDelta, readVisualPosition } from '../extensions/content-editor-workbench/src/visual-editing-position.js';

test('office photo and map positions are independent and reject missing fields', () => {
  const section = { items: [{ image: '/photo.jpg', map: '/map.jpg' }, { image: '/other.jpg' }] };
  assert.deepEqual(applyVisualPositionDelta(section, 'items.0.field_presentation.image', { x: 10, y: -5 }), { x: 10, y: -5 });
  assert.deepEqual(readVisualPosition(section, 'items.0.field_presentation.map'), { x: 0, y: 0 });
  assert.equal(section.items[0].layout, undefined);
  assert.equal(section.items[1].field_presentation, undefined);
  assert.equal(applyVisualPositionDelta(section, 'items.1.field_presentation.map', { x: 1, y: 1 }), null);
  assert.equal(applyVisualPositionDelta(section, 'items.0.field_presentation.__proto__', { x: 1, y: 1 }), null);
});

test('slot-backed office media can store positions without adding image URLs', () => {
  const section = { items: [{ media_role: 'office-1', map_media_role: 'office-map-1' }] };
  assert.deepEqual(applyVisualPositionDelta(section, 'items.0.field_presentation.image', { x: 10, y: 0 }), { x: 10, y: 0 });
  assert.deepEqual(applyVisualPositionDelta(section, 'items.0.field_presentation.map', { x: 0, y: 5 }), { x: 0, y: 5 });
  assert.equal(section.items[0].image, undefined);
  assert.deepEqual(readVisualPosition(section, 'items.0.field_presentation.image'), { x: 10, y: 0 });
});

test('repeated visual elements keep position on their own item instead of moving the whole section', () => {
  const section = {
    items: [
      { title: '第一项', layout: { desktop: { offset_x: 2, offset_y: -1 } } },
      { title: '第二项' }
    ],
    layout: { desktop: { offset_x: 0, offset_y: 0 } }
  };

  assert.deepEqual(readVisualPosition(section, 'items.1.title'), { x: 0, y: 0 });
  assert.deepEqual(applyVisualPositionDelta(section, 'items.1.title', { x: 4.5, y: -3 }), { x: 4.5, y: -3 });
  assert.deepEqual(section.items[1].layout.desktop, { offset_x: 4.5, offset_y: -3 });
  assert.deepEqual(section.items[0].layout.desktop, { offset_x: 2, offset_y: -1 });
  assert.deepEqual(section.layout.desktop, { offset_x: 0, offset_y: 0 });
});

test('section fields retain section-level position and values are bounded', () => {
  const section = { title: '标题', layout: { desktop: { offset_x: 29, offset_y: -29 } } };
  assert.deepEqual(applyVisualPositionDelta(section, 'title', { x: 5, y: -5 }), { x: 30, y: -30 });
  assert.deepEqual(readVisualPosition(section, 'title'), { x: 30, y: -30 });
});

test('scalar section fields can opt into independent field presentation without moving sibling copy', () => {
  const section = { title: '标题', body: '正文', layout: { desktop: { offset_x: 1, offset_y: 2 } } };
  assert.deepEqual(applyVisualPositionDelta(section, 'field_presentation.title', { x: 6, y: -4 }), { x: 6, y: -4 });
  assert.deepEqual(readVisualPosition(section, 'field_presentation.title'), { x: 6, y: -4 });
  assert.deepEqual(readVisualPosition(section, 'field_presentation.body'), { x: 0, y: 0 });
  assert.deepEqual(section.layout.desktop, { offset_x: 1, offset_y: 2 });
  assert.deepEqual(section.field_presentation.title.layout.desktop, { offset_x: 6, offset_y: -4 });
});

test('product series card copy stores its position in the dedicated presentation field', () => {
  const series = { name: 'FR-XS', positioning: '精密切割' };
  assert.deepEqual(applyVisualPositionDelta(series, 'presentation.field_presentation.name', { x: 3, y: -2 }), { x: 3, y: -2 });
  assert.deepEqual(readVisualPosition(series, 'presentation.field_presentation.name'), { x: 3, y: -2 });
  assert.equal(series.presentation.field_presentation.positioning, undefined);
});

test('position paths reject unknown or prototype targets without mutating the record', () => {
  const section = { items: [{ title: '标题' }] };
  assert.equal(applyVisualPositionDelta(section, 'missing.0.title', { x: 1, y: 1 }), null);
  assert.equal(applyVisualPositionDelta(section, 'items.0.__proto__.title', { x: 1, y: 1 }), null);
  assert.deepEqual(section, { items: [{ title: '标题' }] });
});

test('editing position enables the controlled layout presentation group', () => {
  const section = { title: '标题' };
  assert.deepEqual(applyVisualPositionDelta(section, 'title', { x: 4, y: -2 }), { x: 4, y: -2 });
  assert.equal(section.layout.enabled, true);
});
