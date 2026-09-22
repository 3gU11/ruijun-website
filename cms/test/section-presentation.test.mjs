import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultSectionPresentation, normalizeFieldPresentations, normalizeSectionPresentation, validateSectionPresentation } from '../extensions/content-editor-workbench/src/section-presentation.js';

test('CMS presentation editor supplies safe defaults for legacy page sections', () => {
  const result = normalizeSectionPresentation({ title: '旧段落' });
  assert.deepEqual(result, defaultSectionPresentation());
  assert.equal(result.layout.enabled, false);
  assert.equal(result.text_style.enabled, false);
});

test('CMS presentation editor retains explicit group enablement', () => {
  const result = normalizeSectionPresentation({ layout: { enabled: true }, text_style: { enabled: true }, responsive: { enabled: true }, media_presentation: { enabled: true } });
  assert.equal(result.layout.enabled, true);
  assert.equal(result.text_style.enabled, true);
  assert.equal(result.responsive.enabled, true);
  assert.equal(result.media_presentation.enabled, true);
});

test('CMS presentation editor rejects invalid position, color, size and media focus', () => {
  assert.match(validateSectionPresentation({ layout: { desktop: { offset_x: 31 } } }), /-30% 至 30%/);
  assert.match(validateSectionPresentation({ text_style: { color: 'red' } }), /#RRGGBB/);
  assert.match(validateSectionPresentation({ text_style: { size_desktop: 121 } }), /120 px/);
  assert.match(validateSectionPresentation({ media_presentation: { focal_y: -1 } }), /0% 至 100%/);
  assert.equal(validateSectionPresentation(defaultSectionPresentation()), '');
});

test('CMS presentation editor normalizes only named scalar field presentations', () => {
  const result = normalizeFieldPresentations({
    title: { layout: { enabled: true, desktop: { offset_x: 9 } }, text_style: { enabled: true, size_desktop: 38 } },
    'bad.key': { layout: { enabled: true } },
    private_note: { layout: { enabled: true } }
  }, ['title', 'body']);
  assert.equal(result.title.layout.desktop.offset_x, 9);
  assert.equal(result.title.text_style.size_desktop, 38);
  assert.equal(Object.hasOwn(result, 'bad.key'), false);
  assert.equal(Object.hasOwn(result, 'private_note'), false);
});
