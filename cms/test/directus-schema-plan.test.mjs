import assert from 'node:assert/strict';
import test from 'node:test';

const { buildDirectusSchemaPlan } = await import('../schema/directus-schema-plan.mjs');

test('Directus schema plan materializes every CMS collection and field from the content contract', () => {
  const plan = buildDirectusSchemaPlan();

  assert.equal(plan.collections.length, 24);
  assert.deepEqual(plan.collections.find((collection) => collection.collection === 'pages').meta.translations, [{ language: 'zh-CN', translation: '页面' }]);
  assert.deepEqual(plan.collections.find((collection) => collection.collection === 'knowledge_items').meta.translations, [{ language: 'zh-CN', translation: '常见问题知识' }]);
  assert.equal(plan.fields.find((field) => field.collection === 'service_entry_clicks' && field.field === 'entry_type').type, 'string');
  assert.equal(plan.fields.filter((field) => field.collection === 'product_models').find((field) => field.field === 'parameters').type, 'json');
  assert.deepEqual(plan.fields.filter((field) => field.type === 'json').map((field) => field.meta.special), Array(plan.fields.filter((field) => field.type === 'json').length).fill(['cast-json']));
  const productStatus = plan.fields.find((field) => field.collection === 'product_models' && field.field === 'status');
  assert.deepEqual(productStatus.schema, { is_nullable: false, default_value: 'draft' });
  assert.deepEqual(plan.fields.find((field) => field.collection === 'pages' && field.field === 'title').meta.translations, [{ language: 'zh-CN', translation: '标题' }]);
  assert.equal(plan.fields.find((field) => field.collection === 'leads' && field.field === 'publication_state').schema.default_value, 'private');
  assert.equal(plan.fields.find((field) => field.collection === 'leads' && field.field === 'follow_up_note').type, 'text');
  assert.deepEqual(plan.fields.find((field) => field.collection === 'leads' && field.field === 'date_created').meta.special, ['date-created']);
  assert.equal(plan.fields.find((field) => field.collection === 'leads' && field.field === 'date_created').meta.readonly, true);
  const uploadSession = plan.fields.find((field) => field.collection === 'lead_upload_sessions' && field.field === 'upload_reference');
  assert.deepEqual(uploadSession.schema, { is_nullable: false, is_unique: true, default_value: null });
  assert.equal(plan.fields.find((field) => field.collection === 'lead_upload_sessions' && field.field === 'file_id').type, 'string');
  const leadStatus = plan.fields.find((field) => field.collection === 'leads' && field.field === 'status');
  assert.deepEqual(leadStatus.meta.options.choices.map((choice) => choice.value), ['new', 'assigned', 'in_progress', 'converted', 'invalid', 'duplicate', 'spam']);
  const notificationStatus = plan.fields.find((field) => field.collection === 'lead_notification_jobs' && field.field === 'status');
  assert.deepEqual(notificationStatus.meta.options.choices.map((choice) => choice.value), ['pending', 'retrying', 'processing', 'sent', 'manual_review', 'manual_sent', 'resolved']);
  assert.equal(plan.fields.find((field) => field.collection === 'lead_notification_jobs' && field.field === 'activity_log').type, 'json');
  assert.deepEqual(plan.fields.find((field) => field.collection === 'lead_notification_jobs' && field.field === 'date_updated').meta.special, ['date-updated']);
  assert.equal(plan.fields.find((field) => field.collection === 'lead_notification_jobs' && field.field === 'date_updated').meta.readonly, true);
  assert.equal(plan.fields.find((field) => field.collection === 'media_assets' && field.field === 'file_id').type, 'string');
  assert.equal(plan.fields.find((field) => field.collection === 'product_release_snapshots' && field.field === 'restored_from_release_id').type, 'string');
  assert.equal(plan.fields.find((field) => field.collection === 'product_release_snapshots' && field.field === 'restored_from_version').type, 'integer');
  assert.equal(plan.fields.find((field) => field.collection === 'product_release_snapshots' && field.field === 'restore_note').type, 'text');
  assert.equal(plan.collections.find((collection) => collection.collection === 'content_preview_tokens').meta.translations[0].translation, '草稿预览令牌');
  assert.equal(plan.collections.find((collection) => collection.collection === 'pages').meta.note, '瑞钧官网内容后台数据集合');
  assert.deepEqual(plan.fields.find((field) => field.collection === 'content_preview_tokens' && field.field === 'token_hash').schema, { is_nullable: false, is_unique: true, default_value: null });
});

test('Directus schema plan preserves CMS role boundaries and explicit publish authority', () => {
  const plan = buildDirectusSchemaPlan();
  const reviewer = plan.roles.find((role) => role.key === 'review_manager');
  const sales = plan.roles.find((role) => role.key === 'sales_user');
  const websiteBff = plan.roles.find((role) => role.key === 'website_bff');
  const administrator = plan.roles.find((role) => role.key === 'system_admin');
  const auditReader = plan.roles.find((role) => role.key === 'content_audit_reader');
  const notificationWorker = plan.roles.find((role) => role.key === 'notification_worker');
  const notificationManager = plan.roles.find((role) => role.key === 'notification_manager');

  assert.equal(plan.roles.length, 9);
  assert.equal(administrator.admin, true);
  assert.equal(auditReader.name, '内容审核只读账号');
  assert.equal(notificationWorker.name, '通知任务服务账号');
  assert.equal(notificationManager.name, '通知管理员');
  assert.deepEqual(reviewer.publish_collections, ['pages', 'repair_page_configs', 'product_series', 'case_studies', 'articles', 'manufacturing_evidence', 'qualifications', 'milestones', 'service_locations']);
  assert.deepEqual(sales.manage_collections, ['leads']);
  assert.equal(sales.publish_collections.length, 0);
  assert.equal(websiteBff.admin, false);
  assert.deepEqual(websiteBff.manage_collections, []);
  assert.deepEqual(plan.roles.find((role) => role.key === 'notification_worker').manage_collections, []);
  assert.deepEqual(plan.roles.find((role) => role.key === 'notification_manager').manage_collections, ['lead_notification_jobs']);
  assert.deepEqual(plan.roles.find((role) => role.key === 'read_only_manager').manage_collections, ['service_entry_clicks']);
  assert.ok(!plan.roles.find((role) => role.key === 'content_editor').manage_collections.includes('media_assets'));
  assert.ok(!reviewer.manage_collections.includes('knowledge_items'));
});
