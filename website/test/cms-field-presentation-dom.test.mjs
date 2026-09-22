import assert from 'node:assert/strict';
import test from 'node:test';

import { cmsFieldPresentationDomAttributes, resolveCmsFieldPresentationPath, syncCmsFieldPresentations } from '../utils/cms-field-presentation-dom.mjs';

test('field presentation DOM resolver accepts only an explicit scalar field path', () => {
  assert.equal(resolveCmsFieldPresentationPath({ fieldPath: 'title', positionFieldPath: 'field_presentation.title' }), 'title');
  assert.equal(resolveCmsFieldPresentationPath({ fieldPath: 'body' }), 'body');
  assert.equal(resolveCmsFieldPresentationPath({ fieldPath: 'items.0.title' }), '');
  assert.equal(resolveCmsFieldPresentationPath({ fieldPath: 'title', positionFieldPath: 'field_presentation.__proto__' }), '');
});

test('field presentation DOM attributes expose only bounded CSS variables and explicit enablement', () => {
  const attributes = cmsFieldPresentationDomAttributes({
    layout: { enabled: true, desktop: { offset_x: 7, offset_y: -2 } },
    text_style: { enabled: true, size_desktop: 46, weight: 700, color: '#E60012' }
  });

  assert.equal(attributes.className, 'cms-field-presentation');
  assert.equal(attributes.dataset.cmsLayoutEnabled, 'true');
  assert.equal(attributes.dataset.cmsTextEnabled, 'true');
  assert.equal(attributes.style['--cms-offset-x-desktop'], '7%');
  assert.equal(attributes.style['--cms-text-size-desktop'], '46px');
  assert.equal(Object.hasOwn(attributes.style, 'position'), false);
});

function createElement(attributes = {}) {
  const values = new Map(Object.entries(attributes));
  const styleValues = new Map();
  const classes = new Set();
  return {
    dataset: {},
    classList: { add: (value) => classes.add(value), remove: (value) => classes.delete(value), contains: (value) => classes.has(value) },
    style: { setProperty: (key, value) => styleValues.set(key, value), removeProperty: (key) => styleValues.delete(key), getPropertyValue: (key) => styleValues.get(key) || '' },
    getAttribute: (key) => values.get(key) || null,
    querySelectorAll: () => [],
    closest: () => null
  };
}

test('field presentation renderer clears its styles after a section configuration is removed', () => {
  const field = createElement({ 'data-cms-preview-field-path': 'title' });
  const root = createElement({
    'data-cms-field-presentations': JSON.stringify({ title: { text_style: { enabled: true, size_desktop: 42 } } })
  });
  root.querySelectorAll = () => [field];
  field.closest = () => root;
  const documentObject = {
    querySelectorAll: (selector) => selector === '[data-cms-field-presentations]'
      ? [root]
      : field.dataset.cmsFieldPresentationManaged === 'true' ? [field] : []
  };

  syncCmsFieldPresentations(documentObject);
  assert.equal(field.classList.contains('cms-field-presentation'), true);
  assert.equal(field.style.getPropertyValue('--cms-text-size-desktop'), '42px');

  root.getAttribute = () => null;
  documentObject.querySelectorAll = (selector) => selector === '[data-cms-field-presentations]'
    ? []
    : field.dataset.cmsFieldPresentationManaged === 'true' ? [field] : [];
  syncCmsFieldPresentations(documentObject);

  assert.equal(field.classList.contains('cms-field-presentation'), false);
  assert.equal(field.style.getPropertyValue('--cms-text-size-desktop'), '');
  assert.equal(field.dataset.cmsFieldPresentationManaged, undefined);
});
