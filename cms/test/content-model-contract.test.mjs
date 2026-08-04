import assert from 'node:assert/strict';
import test from 'node:test';

const { contentCollections, contentRoles, contentStates } = await import('../schema/content-model.mjs');

test('CMS content model covers every PRD object with an explicit publication state', () => {
  const expected = [
    'pages', 'product_series', 'product_models', 'product_parameters', 'case_studies',
    'articles', 'manufacturing_evidence', 'qualifications', 'milestones', 'service_resources',
    'service_locations', 'knowledge_items', 'external_service_entries', 'service_entry_clicks', 'media_assets', 'leads', 'lead_dedupe_keys', 'lead_notification_jobs', 'lead_upload_sessions', 'content_versions', 'site_settings'
  ];

  assert.deepEqual(contentCollections.map((collection) => collection.name), expected);
  assert.deepEqual(contentStates, ['draft', 'review', 'scheduled', 'published', 'unpublished', 'archived', 'rejected']);
  for (const collection of contentCollections) {
    assert.ok(collection.fields.some((field) => field.name === 'status'), `${collection.name} needs a status field`);
  }
});

test('lead notification jobs are private operational records rather than publishable content', () => {
  const jobs = contentCollections.find((collection) => collection.name === 'lead_notification_jobs');

  assert.deepEqual(jobs.defaultValues, { status: 'pending', publication_state: 'private' });
  for (const field of ['lead_reference', 'delivery_channel', 'attempts', 'next_attempt_at', 'sent_at', 'last_error', 'lock_token', 'locked_by', 'locked_at', 'handled_by', 'handled_at', 'manual_note', 'activity_log']) {
    assert.ok(jobs.fields.some((candidate) => candidate.name === field), `lead_notification_jobs needs ${field}`);
  }
});

test('lead dedupe keys are private HMAC records rather than customer contact data', () => {
  const keys = contentCollections.find((collection) => collection.name === 'lead_dedupe_keys');

  assert.deepEqual(keys.defaultValues, { status: 'active', publication_state: 'private' });
  assert.ok(keys.fields.some((field) => field.name === 'key_hash' && field.required && field.unique));
  assert.ok(keys.fields.some((field) => field.name === 'expires_at' && field.required));
  assert.ok(!keys.fields.some((field) => field.name === 'phone'));
});

test('lead upload sessions are private operational records with a stable reference and no publication path', () => {
  const sessions = contentCollections.find((collection) => collection.name === 'lead_upload_sessions');

  assert.deepEqual(sessions.defaultValues, { status: 'pending', publication_state: 'private' });
  assert.ok(sessions.fields.some((field) => field.name === 'upload_reference' && field.required && field.unique));
  for (const field of ['file_name', 'mime_type', 'byte_size', 'file_id', 'expires_at', 'lead_reference']) {
    assert.ok(sessions.fields.some((candidate) => candidate.name === field), `lead_upload_sessions needs ${field}`);
  }
});

test('service entry clicks are private anonymous attribution records', () => {
  const clicks = contentCollections.find((collection) => collection.name === 'service_entry_clicks');

  assert.deepEqual(clicks.defaultValues, { status: 'recorded', publication_state: 'private' });
  assert.deepEqual(clicks.fields.filter((field) => ['entry_type', 'source_page'].includes(field.name)).map((field) => field.name), ['entry_type', 'source_page']);
  assert.ok(!clicks.fields.some((field) => /name|phone|machine|fault|requirement/i.test(field.name)));
});

test('CMS roles preserve PRD editing, review, publishing, and sales boundaries', () => {
  assert.deepEqual(contentRoles, [
    'system_admin', 'content_editor', 'technical_reviewer', 'brand_reviewer',
    'publisher', 'sales_user', 'read_only_manager', 'content_audit_reader', 'notification_worker', 'notification_manager', 'website_bff'
  ]);
});

test('public media assets retain file provenance and always enter the same audited publication workflow', () => {
  const assets = contentCollections.find((collection) => collection.name === 'media_assets');

  assert.deepEqual(assets.defaultValues, { status: 'draft', publication_state: 'unpublished' });
  for (const field of ['file_id', 'original_file_name', 'mime_type', 'byte_size', 'usage_scope', 'alt_text', 'copyright_status', 'authorization_note', 'reviewed_by', 'reviewed_at', 'published_by', 'publication_log']) {
    assert.ok(assets.fields.some((candidate) => candidate.name === field), `media_assets needs ${field}`);
  }
});

test('product records preserve source evidence and default to non-public drafts', () => {
  const productModel = contentCollections.find((collection) => collection.name === 'product_models');
  assert.deepEqual(productModel.defaultValues, { status: 'draft', publication_state: 'unpublished' });
  for (const field of ['series_code', 'model_code', 'source_url', 'source_document', 'review_note', 'reviewed_by', 'reviewed_at', 'published_by', 'publication_log']) {
    assert.ok(productModel.fields.some((candidate) => candidate.name === field), `product_models needs ${field}`);
  }
});

test('reviewable website evidence uses stable source keys so repeat imports cannot create duplicates', () => {
  for (const name of ['manufacturing_evidence', 'qualifications', 'milestones', 'service_resources', 'service_locations']) {
    const collection = contentCollections.find((candidate) => candidate.name === name);
    assert.ok(collection.fields.some((field) => field.name === 'source_key'), `${name} needs source_key`);
  }
});

test('knowledge items retain source identity and server-enforceable audience scope before Dify sync', () => {
  const knowledge = contentCollections.find((collection) => collection.name === 'knowledge_items');

  assert.deepEqual(knowledge.defaultValues, { status: 'draft', publication_state: 'unpublished' });
  assert.ok(knowledge.fields.some((field) => field.name === 'source_key' && field.required && field.unique));
  for (const field of ['visibility', 'channel', 'category', 'question_title', 'applicable_models', 'error_codes', 'risk_level', 'version', 'technical_reviewer', 'dify_sync_status']) {
    assert.ok(knowledge.fields.some((candidate) => candidate.name === field), `knowledge_items needs ${field}`);
  }
});
