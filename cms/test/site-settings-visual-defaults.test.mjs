import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { mergeVisualSiteSettingsDefaults, visualSiteSettingsPayload } from '../extensions/content-editor-workbench/src/site-settings-visual-defaults.js';

test('visual site-settings defaults complete every footer column without dropping an existing override', () => {
  const settings = mergeVisualSiteSettingsDefaults({
    id: 1,
    footer: { columns: [{ title: '新产品中心' }] },
    contacts: { service_phone: '150 5016 6844' }
  });

  assert.equal(settings.footer.columns.length, 3);
  assert.equal(settings.footer.columns[0].title, '新产品中心');
  assert.equal(settings.footer.columns[0].links[0].label, '灵动切割工作站');
  assert.equal(settings.footer.columns[1].links[2].href, '/manufacturing#assembly');
  assert.equal(settings.footer.columns[2].title, '关于我们');
  assert.equal(settings.contacts.domestic_phone, '150 5016 6844');
  assert.equal(settings.contacts.export_email, 'kylewuedm@gmail.com');
});

test('visual site-settings defaults retain the legacy service phone as the domestic edit value', () => {
  const settings = mergeVisualSiteSettingsDefaults({
    contacts: { service_phone: '150 5016 6844' }
  });

  assert.equal(settings.contacts.domestic_phone, '150 5016 6844');
});

test('visual site-settings payload updates only controlled footer and contact roots', () => {
  const settings = mergeVisualSiteSettingsDefaults({
    id: 1,
    footer: { requires_business_review: true },
    contacts: { service_phone: '150 5016 6844' },
    brand: { internal_only: 'preserve elsewhere' }
  });
  settings.footer.columns[0].title = '产品方案';

  const payload = visualSiteSettingsPayload(settings, 'footer.columns.0.title');
  assert.deepEqual(Object.keys(payload), ['footer']);
  assert.equal(payload.footer.requires_business_review, true);
  assert.equal(payload.footer.columns[0].title, '产品方案');
  assert.equal(payload.footer.columns[0].links[5].label, 'FL-XS(pro)');
  assert.equal('brand' in payload, false);
});

test('visual site-settings payload permits only governed footer and brand media slots', () => {
  const settings = mergeVisualSiteSettingsDefaults({ id: 1 });
  settings.footer.address_icon_asset = 'footer-icon';
  settings.brand = { footer_logo_asset: 'footer-logo' };
  assert.deepEqual(visualSiteSettingsPayload(settings, 'footer.address_icon_asset'), { footer: settings.footer });
  assert.deepEqual(visualSiteSettingsPayload(settings, 'brand.footer_logo_asset'), { brand: settings.brand });
});

test('visual site-settings payload rejects paths outside the supported footer, contacts, and media model', () => {
  const settings = mergeVisualSiteSettingsDefaults({ id: 1 });
  assert.equal(visualSiteSettingsPayload(settings, 'brand.display_name'), null);
  assert.equal(visualSiteSettingsPayload(settings, 'footer.__proto__.polluted'), null);
});

test('workbench saves a selected footer field through the narrow site-settings payload path', async () => {
  const workbench = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');

  assert.match(workbench, /selectedVisualRecord\.value\?\.collection === 'site_settings'/);
  assert.match(workbench, /await saveVisualSiteSettings\(\)/);
  assert.match(workbench, /const payload = visualSiteSettingsPayload\(record, fieldPath\)/);
  assert.match(workbench, /api\.patch\(`\/items\/site_settings\/\$\{encodeURIComponent\(record\.id\)\}`, payload\)/);
});
