import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('shared PSD footer exposes purchase title and subtitle as separate editable fields', async () => {
  const footer = await readFile(new URL('../components/PsdFooter.vue', import.meta.url), 'utf8');

  assert.match(footer, /purchase-title', text:'大批量采购', x:3102/);
  assert.match(footer, /purchase-copy-title', text:'你有量', x:3139/);
  assert.match(footer, /purchase-copy-subtitle', text:'我有价', x:3139/);
  assert.match(footer, /'purchase-copy-title': 'footer.purchase_title'/);
  assert.match(footer, /'purchase-copy-subtitle': 'footer.purchase_subtitle'/);
  assert.match(footer, /purchase-phone', text:'15050166844', x:3065/);
  assert.match(footer, /purchase-title,.psd-footer__text--purchase-copy-title,.psd-footer__text--purchase-copy-subtitle,.psd-footer__text--purchase-phone\{text-align:center\}/);
  assert.doesNotMatch(footer, /purchase-copy', text:'你有量\\n我有价'/);
  assert.doesNotMatch(footer, /name: 'products'.*to:/);
  assert.doesNotMatch(footer, /name: 'manufacturing'.*to:/);
  assert.doesNotMatch(footer, /name: 'about'.*to:/);
});

test('manufacturing footer exposes child navigation without heading hit areas', async () => {
  const page = await readFile(new URL('../pages/manufacturing.vue', import.meta.url), 'utf8');

  assert.doesNotMatch(page, /name: 'footer-products'.*to:/);
  assert.doesNotMatch(page, /name: 'footer-manufacturing'.*to:/);
  assert.doesNotMatch(page, /name: 'footer-about'.*to:/);
  assert.match(page, /name: 'footer-workstation'.*to:/);
  assert.match(page, /name: 'footer-cnc'.*to:/);
  assert.match(page, /name: 'footer-honors'.*to:/);
});

test('manufacturing embedded footer exposes purchase title and subtitle independently', async () => {
  const page = await readFile(new URL('../pages/manufacturing.vue', import.meta.url), 'utf8');

  assert.match(page, /footer-purchase-copy-title', text: '你有量'/);
  assert.match(page, /footer-purchase-copy-subtitle', text: '我有价'/);
  assert.match(page, /'footer-purchase-copy-title': 'footer.purchase_title'/);
  assert.match(page, /'footer-purchase-copy-subtitle': 'footer.purchase_subtitle'/);
  assert.doesNotMatch(page, /footer-purchase-copy', text:'你有量\\n我有价'/);
});
