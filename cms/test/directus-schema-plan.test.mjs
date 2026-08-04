import assert from 'node:assert/strict';
import test from 'node:test';

const { buildDirectusSchemaPlan } = await import('../schema/directus-schema-plan.mjs');

test('Directus schema plan materializes every CMS collection and field from the content contract', () => {
  const plan = buildDirectusSchemaPlan();

  assert.equal(plan.collections.length, 21);
  assert.equal(plan.fields.find((field) => field.collection === 'service_entry_clicks' && field.field === 'entry_type').type, 'string');
  assert.equal(plan.fields.filter((field) => field.collection === 'product_models').find((field) => field.field === 'parameters').type, 'json');
  assert.deepEqual(plan.fields.filter((field) => field.type === 'json').map((field) => field.meta.special), Array(plan.fields.filter((field) => field.type === 'json').length).fill(['cast-json']));
  const productStatus = plan.fields.find((field) => field.collection === 'product_models' && field.field === 'status');
  assert.deepEqual(productStatus.schema, { is_nullable: false, default_value: 'draft' });
  assert.equal(plan.fields.find((field) => field.collection === 'leads' && field.field === 'publication_state').schema.default_value, 'private');
  assert.equal(plan.fields.find((field) => field.collection === 'leads' && field.field === 'follow_up_note').type, 'text');
  const uploadSession = plan.fields.find((field) => field.collection === 'lead_upload_sessions' && field.field === 'upload_reference');
  assert.deepEqual(uploadSession.schema, { is_nullable: false, is_unique: true, default_value: null });
  assert.equal(plan.fields.find((field) => field.collection === 'lead_upload_sessions' && field.field === 'file_id').type, 'string');
  const leadStatus = plan.fields.find((field) => field.collection === 'leads' && field.field === 'status');
  assert.deepEqual(leadStatus.meta.options.choices.map((choice) => choice.value), ['new', 'assigned', 'in_progress', 'converted', 'invalid', 'duplicate', 'spam']);
  const notificationStatus = plan.fields.find((field) => field.collection === 'lead_notification_jobs' && field.field === 'status');
  assert.deepEqual(notificationStatus.meta.options.choices.map((choice) => choice.value), ['pending', 'retrying', 'processing', 'sent', 'manual_review', 'manual_sent', 'resolved']);
  assert.equal(plan.fields.find((field) => field.collection === 'lead_notification_jobs' && field.field === 'activity_log').type, 'json');
  assert.equal(plan.fields.find((field) => field.collection === 'media_assets' && field.field === 'file_id').type, 'string');
});

test('Directus schema plan preserves CMS role boundaries and explicit publish authority', () => {
  const plan = buildDirectusSchemaPlan();
  const publisher = plan.roles.find((role) => role.key === 'publisher');
  const sales = plan.roles.find((role) => role.key === 'sales_user');
  const websiteBff = plan.roles.find((role) => role.key === 'website_bff');
  const administrator = plan.roles.find((role) => role.key === 'system_admin');

  assert.equal(plan.roles.length, 11);
  assert.equal(administrator.admin, true);
  assert.deepEqual(publisher.publish_collections, plan.collections.map((collection) => collection.collection).filter((collection) => !['leads', 'lead_dedupe_keys', 'lead_notification_jobs', 'lead_upload_sessions', 'content_versions', 'service_entry_clicks'].includes(collection)));
  assert.deepEqual(sales.manage_collections, ['leads']);
  assert.equal(sales.publish_collections.length, 0);
  assert.equal(websiteBff.admin, false);
  assert.deepEqual(websiteBff.manage_collections, []);
  assert.deepEqual(plan.roles.find((role) => role.key === 'notification_worker').manage_collections, []);
  assert.deepEqual(plan.roles.find((role) => role.key === 'notification_manager').manage_collections, ['lead_notification_jobs']);
  assert.deepEqual(plan.roles.find((role) => role.key === 'read_only_manager').manage_collections, ['service_entry_clicks']);
  assert.ok(plan.roles.find((role) => role.key === 'content_editor').manage_collections.includes('media_assets'));
  assert.ok(plan.roles.find((role) => role.key === 'technical_reviewer').manage_collections.includes('media_assets'));
  assert.ok(plan.roles.find((role) => role.key === 'brand_reviewer').manage_collections.includes('media_assets'));
});
