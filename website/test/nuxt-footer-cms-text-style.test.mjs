import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('PSD footer applies bounded CMS text styles only when each item is enabled', async () => {
  const footer = await readFile(new URL('../components/PsdFooter.vue', import.meta.url), 'utf8');

  assert.match(footer, /style\.enabled !== true/);
  assert.match(footer, /sizeDesktop >= 12 && sizeDesktop <= 72/);
  assert.match(footer, /sizeMobile >= 12 && sizeMobile <= 40/);
  assert.match(footer, /has-cms-text-style/);
  assert.match(footer, /--cms-footer-font-size-desktop/);
  assert.match(footer, /--cms-footer-font-size-mobile/);
});

test('PSD footer exposes a stable site-settings binding for visual editing', async () => {
  const footer = await readFile(new URL('../components/PsdFooter.vue', import.meta.url), 'utf8');

  assert.match(footer, /data-cms-preview-key="site-footer"/);
  assert.match(footer, /data-cms-preview-collection="site_settings"/);
  assert.match(footer, /:data-cms-preview-item-id="settings\.id"/);
  assert.match(footer, /data-cms-preview-field-path/);
});

test('PSD footer keeps domestic and export phone text independently selectable', async () => {
  const footer = await readFile(new URL('../components/PsdFooter.vue', import.meta.url), 'utf8');

  assert.match(footer, /id:'phone-domestic'/);
  assert.match(footer, /id:'phone-export'/);
  assert.match(footer, /'phone-domestic': 'contacts\.domestic_phone'/);
  assert.match(footer, /'phone-export': 'contacts\.export_phone'/);
});

test('PSD footer exposes governed visual media bindings for its brand mark and three contact icons', async () => {
  const footer = await readFile(new URL('../components/PsdFooter.vue', import.meta.url), 'utf8');

  assert.match(footer, /function footerAssetFieldPath\(layerName: string\)/);
  assert.match(footer, /'layer-27': 'brand\.footer_logo_asset'/);
  assert.match(footer, /'layer-01': 'footer\.address_icon_asset'/);
  assert.match(footer, /'layer-03': 'footer\.phone_icon_asset'/);
  assert.match(footer, /'layer-02': 'footer\.email_icon_asset'/);
  assert.match(footer, /data-cms-preview-media-role/);
  assert.match(footer, /data-cms-preview-allow-default/);
});

test('PSD footer merges partial CMS footer columns over its complete visual baseline', async () => {
  const footer = await readFile(new URL('../components/PsdFooter.vue', import.meta.url), 'utf8');

  assert.match(footer, /const defaultFooterColumns = footerColumnSlots\.map/);
  assert.match(footer, /return defaultFooterColumns\.map\(\(fallback, index\)/);
  assert.match(footer, /links: fallback\.links\.map/);
});

test('PSD footer keeps its transparent text container out of media hit testing in visual preview mode', async () => {
  const footer = await readFile(new URL('../components/PsdFooter.vue', import.meta.url), 'utf8');

  assert.match(footer, /data-cms-preview-edit-mode="true"/);
  assert.match(footer, /\.psd-footer__editable\{[^}]*pointer-events:none/);
  assert.match(footer, /html\[data-cms-preview-edit-mode="true"\]\s+\.psd-footer__text\[data-cms-preview-field-path\]\{pointer-events:auto;cursor:text\}/);
  assert.doesNotMatch(footer, /html\[data-cms-preview-edit-mode="true"\]\s+\.psd-footer__editable\{pointer-events:auto\}/);
  assert.match(footer, /html\[data-cms-preview-edit-mode="true"\]\s+\.psd-footer__layer\[data-cms-preview-field-path\]\{pointer-events:auto\}/);
  assert.match(footer, /html\[data-cms-preview-edit-mode="true"\]\s+\.psd-footer__hit\{pointer-events:none\}/);
});

test('manufacturing embedded footer consumes the same global CMS settings without changing PSD coordinates', async () => {
  const page = await readFile(new URL('../pages/manufacturing.vue', import.meta.url), 'utf8');

  assert.match(page, /useFetch\('\/api\/public\/v1\/navigation'/);
  assert.match(page, /const editableFooterTexts = computed/);
  assert.match(page, /footerSettings\.value\?\.text_styles/);
  assert.match(page, /'--fx': text\.x \+ 32/);
  assert.match(page, /'--fy': text\.y - 11153/);
  assert.match(page, /footer_logo_path/);
  assert.match(page, /address_icon_path/);
});
