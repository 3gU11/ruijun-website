import assert from 'node:assert/strict';
import test from 'node:test';

const { buildSiteSettingsDraft } = await import('../import/site-settings-drafts.mjs');

test('site settings draft keeps global navigation and contacts unpublished pending business review', () => {
  const draft = buildSiteSettingsDraft();

  assert.equal(draft.setting_key, 'global');
  assert.equal(draft.status, 'draft');
  assert.equal(draft.publication_state, 'unpublished');
  assert.deepEqual(draft.navigation.map((item) => item.href), ['/product', '/manufacturing', '/about', '/service']);
  assert.equal(draft.contacts.service_phone, '150 5016 6844');
  assert.equal(draft.contacts.header_cta.href, '/service');
  assert.equal(draft.footer.requires_business_review, true);
  assert.ok(draft.review_note);
});
