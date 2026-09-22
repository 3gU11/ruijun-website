import assert from 'node:assert/strict';
import test from 'node:test';

import { readFile } from 'node:fs/promises';
import { fieldPresentationAttributes, hasSectionPresentation, normalizeSectionPresentation, positionedItemPresentationAttributes, sectionPresentationAttributes, sectionPresentationStyle } from '../shared/section-presentation.mjs';

test('section presentation normalizes only controlled layout and typography fields', () => {
  const result = normalizeSectionPresentation({
    layout: { template: 'overlay-right', align_x: 'right', width: 'wide', z_index: 4, desktop: { offset_x: 12, offset_y: -8 }, mobile: { offset_x: 500 } },
    text_style: { preset: 'hero', weight: 700, size_desktop: 72, size_mobile: 38, color: '#e60012', line_height: 1.15, css: 'position:fixed' },
    responsive: { mobile_visible: false, mobile_template: 'stack' },
    media_presentation: { fit: 'contain', focal_x: 65, focal_y: 40, overlay: 'dark-30' },
    style: 'display:none', script: 'alert(1)'
  });

  assert.equal(result.layout.template, 'overlay-right');
  assert.equal(result.layout.desktop.offset_x, 12);
  assert.equal(result.layout.mobile.offset_x, 0);
  assert.equal(result.text_style.color, '#E60012');
  assert.equal(result.responsive.mobile_visible, false);
  assert.equal(result.media_presentation.fit, 'contain');
  assert.equal(Object.hasOwn(result, 'style'), false);
  assert.equal(Object.hasOwn(result.text_style, 'css'), false);
});

test('section presentation emits bounded CSS custom properties for desktop and mobile', () => {
  const source = { layout: { width: 'wide', gap: 'large', desktop: { offset_x: 10, offset_y: -6 }, mobile: { offset_x: 2, offset_y: 3 } }, text_style: { weight: 500, size_desktop: 52, size_mobile: 30, color: '#112233' }, media_presentation: { fit: 'contain', focal_x: 20, focal_y: 80 } };
  const desktop = sectionPresentationStyle(source);
  const mobile = sectionPresentationStyle(source, 'mobile');
  assert.equal(desktop['--cms-offset-x'], '10%');
  assert.equal(desktop['--cms-text-size'], '52px');
  assert.equal(mobile['--cms-offset-x'], '2%');
  assert.equal(mobile['--cms-text-size'], '30px');
  assert.equal(desktop['--cms-media-position'], '20% 80%');
  assert.equal(hasSectionPresentation(source), true);
  assert.equal(hasSectionPresentation({ title: '普通段落' }), false);
});

test('presentation groups stay disabled by default so legacy PSD layout is unchanged', () => {
  const attributes = sectionPresentationAttributes({ title: '旧页面段落' });
  assert.equal(attributes['data-cms-layout-enabled'], 'false');
  assert.equal(attributes['data-cms-text-enabled'], 'false');
  assert.equal(attributes['data-cms-media-enabled'], 'false');
  assert.equal(attributes['data-cms-responsive-enabled'], 'false');
});

test('presentation groups expose explicit opt-in flags to the page renderer', () => {
  const attributes = sectionPresentationAttributes({
    layout: { enabled: true }, text_style: { enabled: true },
    media_presentation: { enabled: true }, responsive: { enabled: true }
  });
  assert.equal(attributes['data-cms-layout-enabled'], 'true');
  assert.equal(attributes['data-cms-text-enabled'], 'true');
  assert.equal(attributes['data-cms-media-enabled'], 'true');
  assert.equal(attributes['data-cms-responsive-enabled'], 'true');
});

test('repeated items opt into self positioning without changing disabled legacy layout', async () => {
  const disabled = positionedItemPresentationAttributes({ title: '旧节点' });
  const enabled = positionedItemPresentationAttributes({ layout: { enabled: true, desktop: { offset_x: 8, offset_y: -4 } } });
  assert.ok(disabled.class.includes('cms-positioned-item'));
  assert.equal(disabled['data-cms-layout-enabled'], 'false');
  assert.equal(enabled.style['--cms-offset-x-desktop'], '8%');
  const css = await readFile(new URL('../assets/cms-presentation.css', import.meta.url), 'utf8');
  assert.match(css, /\.cms-positioned-item\[data-cms-layout-enabled="true"\][\s\S]*translate: var\(--cms-offset-x-desktop\) var\(--cms-offset-y-desktop\)/);
  assert.match(css, /data-cms-text-enabled="true"[\s\S]*font-size: var\(--cms-text-size-desktop\) !important/);
});

test('repeated card items apply their own enabled typography without changing sibling cards', async () => {
  const attributes = sectionPresentationAttributes({
    text_style: { enabled: true, size_desktop: 22, weight: 700, color: '#C62828' }
  });
  assert.equal(attributes['data-cms-text-enabled'], 'true');
  assert.equal(attributes.style['--cms-text-size-desktop'], '22px');

  const css = await readFile(new URL('../assets/cms-presentation.css', import.meta.url), 'utf8');
  assert.match(css, /\.cms-positioned-item\.cms-presentation\[data-cms-text-enabled="true"\] \.cms-styled-text[\s\S]*font-size: var\(--cms-text-size-desktop\) !important/);
});

test('field presentation applies bounded layout and typography to one scalar without inheriting the section style', async () => {
  const attributes = fieldPresentationAttributes({
    field_presentation: {
      title: { layout: { enabled: true, desktop: { offset_x: 8, offset_y: -3 } }, text_style: { enabled: true, size_desktop: 42, weight: 700 } }
    }
  }, 'title');
  const untouched = fieldPresentationAttributes({}, 'body');
  assert.equal(attributes['data-cms-layout-enabled'], 'true');
  assert.equal(attributes['data-cms-text-enabled'], 'true');
  assert.equal(attributes.style['--cms-offset-x-desktop'], '8%');
  assert.equal(attributes.style['--cms-text-size-desktop'], '42px');
  assert.equal(untouched['data-cms-layout-enabled'], 'false');
  const css = await readFile(new URL('../assets/cms-presentation.css', import.meta.url), 'utf8');
  assert.match(css, /\.cms-field-presentation\[data-cms-layout-enabled="true"\]/);
  assert.match(css, /\.cms-field-presentation\[data-cms-text-enabled="true"\]/);
  assert.match(css, /#__nuxt \.cms-field-presentation\[data-cms-text-enabled="true"\]/);
});

test('Nuxt loads the governed presentation stylesheet so enabled field edits affect the real canvas', async () => {
  const config = await readFile(new URL('../nuxt.config.ts', import.meta.url), 'utf8');
  assert.match(config, /['"]~\/assets\/cms-presentation\.css['"]/);
});

test('section roots expose only normalized scalar field presentations for the shared renderer', () => {
  const attributes = sectionPresentationAttributes({
    title: '标题',
    body: '正文',
    field_presentation: {
      title: { layout: { enabled: true, desktop: { offset_x: 5 } } },
      unknown: { layout: { enabled: true, desktop: { offset_x: 20 } } },
      'bad.path': { layout: { enabled: true } }
    }
  });
  const result = JSON.parse(attributes['data-cms-field-presentations']);
  assert.equal(result.title.layout.desktop.offset_x, 5);
  assert.equal(Object.hasOwn(result, 'unknown'), false);
  assert.equal(Object.hasOwn(result, 'bad.path'), false);
});
