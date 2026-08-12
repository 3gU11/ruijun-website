const field = (name, type, options = {}) => ({ name, type, ...options });

const publicationFields = [
  field('status', 'string', { required: true }),
  field('publication_state', 'string', { required: true }),
  field('published_at', 'datetime'),
  field('source_url', 'string'),
  field('source_document', 'string'),
  field('review_note', 'text'),
  field('reviewed_by', 'string'),
  field('reviewed_at', 'datetime'),
  field('published_by', 'string'),
  field('publication_log', 'json')
];

const content = (name, fields, defaultValues = { status: 'draft', publication_state: 'unpublished' }) => ({
  name,
  fields: [...fields, ...publicationFields],
  defaultValues
});

export const contentStates = Object.freeze([
  'draft', 'review', 'scheduled', 'published', 'unpublished', 'archived', 'rejected'
]);

export const contentRoles = Object.freeze([
  'system_admin',
  'content_editor',
  'review_manager',
  'sales_user',
  'read_only_manager',
  'content_audit_reader',
  'notification_worker',
  'notification_manager',
  'website_bff'
]);

export const contentCollections = Object.freeze([
  content('pages', [
    field('slug', 'string', { required: true }), field('title', 'string', { required: true }),
    field('language', 'string', { required: true }), field('sections', 'json'), field('seo', 'json')
  ]),
  content('repair_page_configs', [
    field('page_key', 'string', { required: true, unique: true }), field('title', 'string', { required: true }),
    field('intro', 'text'), field('hero_asset', 'string'), field('model_cards', 'json'), field('action_cards', 'json'),
    field('process_steps', 'json'), field('notices', 'json'), field('faq_refs', 'json'), field('seo', 'json'), field('language', 'string')
  ]),
  content('product_series', [
    field('series_code', 'string', { required: true }), field('slug', 'string', { required: true }),
    field('name', 'string', { required: true }), field('positioning', 'text'), field('scenarios', 'json'),
    field('capabilities', 'json'), field('cover_asset', 'string'), field('sort_order', 'integer'), field('language', 'string'),
    field('import_evidence', 'json')
  ]),
  content('product_models', [
    field('series_code', 'string', { required: true }), field('model_code', 'string', { required: true }),
    field('slug', 'string'), field('name', 'string', { required: true }), field('parameters', 'json'),
    field('configuration', 'json'), field('media', 'json'), field('resources', 'json'), field('case_studies', 'json'),
    field('import_evidence', 'json')
  ]),
  content('product_parameters', [
    field('model_code', 'string', { required: true }), field('group_name', 'string'), field('field_name', 'string', { required: true }),
    field('value', 'string', { required: true }), field('unit', 'string'), field('sort_order', 'integer'), field('test_conditions', 'text'),
    field('import_evidence', 'json')
  ]),
  content('case_studies', [
    field('slug', 'string', { required: true }), field('industry', 'string'), field('material', 'string'),
    field('thickness', 'string'), field('model_code', 'string'), field('process', 'text'), field('result', 'text'), field('authorization_status', 'string')
  ]),
  content('articles', [
    field('slug', 'string', { required: true }), field('category', 'string', { required: true }), field('title', 'string', { required: true }),
    field('summary', 'text'), field('body', 'text'), field('video_url', 'string'), field('cover_asset', 'string'), field('seo', 'json')
  ]),
  content('manufacturing_evidence', [
    field('source_key', 'string', { required: true }), field('process', 'string', { required: true }), field('description', 'text'), field('media', 'json'), field('inspection_evidence', 'text'), field('sort_order', 'integer')
  ]),
  content('qualifications', [
    field('source_key', 'string', { required: true }), field('type', 'string', { required: true }), field('name', 'string', { required: true }), field('certificate_number', 'string'),
    field('issuer', 'string'), field('valid_until', 'date'), field('assets', 'json'), field('sort_order', 'integer'), field('authorization_status', 'string')
  ]),
  content('milestones', [
    field('source_key', 'string', { required: true }), field('year', 'integer', { required: true }), field('event', 'text', { required: true }), field('evidence', 'text'), field('sort_order', 'integer')
  ]),
  content('service_resources', [
    field('source_key', 'string', { required: true }), field('type', 'string', { required: true }), field('applicable_models', 'json'), field('version', 'string'), field('language', 'string'), field('asset', 'string'), field('updated_at', 'datetime')
  ]),
  content('service_locations', [
    field('source_key', 'string', { required: true }), field('region', 'string', { required: true }), field('city', 'string'), field('service_scope', 'text'),
    field('contact', 'json'), field('business_status', 'string'), field('valid_until', 'date')
  ]),
  content('knowledge_items', [
    field('source_key', 'string', { required: true, unique: true }), field('visibility', 'string', { required: true }), field('channel', 'string', { required: true }),
    field('category', 'string', { required: true }), field('question_title', 'string', { required: true }), field('applicable_models', 'json'),
    field('error_codes', 'json'), field('symptoms', 'text'), field('troubleshooting_steps', 'json'), field('risk_level', 'string', { required: true }),
    field('safety_preconditions', 'json'), field('escalation_guidance', 'text'), field('media', 'json'), field('version', 'string'), field('technical_reviewer', 'string'), field('dify_sync_status', 'string')
  ]),
  content('external_service_entries', [
    field('entry_type', 'string', { required: true }), field('url', 'string', { required: true }), field('enabled', 'boolean', { required: true }),
    field('open_mode', 'string', { required: true }), field('fallback_phone', 'string'), field('health_status', 'string')
  ]),
  content('service_entry_clicks', [
    field('entry_type', 'string', { required: true }), field('source_page', 'string', { required: true })
  ], { status: 'recorded', publication_state: 'private' }),
  content('media_assets', [
    field('file_id', 'string', { required: true }), field('original_file_name', 'string', { required: true }),
    field('mime_type', 'string', { required: true }), field('byte_size', 'integer', { required: true }), field('usage_scope', 'string', { required: true }),
    field('alt_text', 'string'), field('copyright_status', 'string', { required: true }), field('authorization_note', 'text')
  ]),
  content('leads', [
    field('lead_reference', 'string', { required: true }), field('lead_type', 'string', { required: true }), field('source_page', 'string', { required: true }),
    field('source_campaign', 'string'), field('name', 'string', { required: true }), field('phone', 'string', { required: true }),
    field('company', 'string'), field('email', 'string'), field('requirement', 'text'), field('product_series', 'string'),
    field('product_model', 'string'), field('attachment_ids', 'json'), field('owner', 'string'), field('activity_log', 'json'), field('follow_up_note', 'text'), field('consent_at', 'datetime'),
    field('date_created', 'datetime', { special: 'date-created', readonly: true }),
    field('date_updated', 'datetime', { special: 'date-updated', readonly: true })
  ], { status: 'new', publication_state: 'private' }),
  content('lead_dedupe_keys', [
    field('key_hash', 'string', { required: true, unique: true }), field('expires_at', 'datetime', { required: true })
  ], { status: 'active', publication_state: 'private' }),
  content('lead_notification_jobs', [
    field('lead_reference', 'string', { required: true }), field('delivery_channel', 'string', { required: true }),
    field('attempts', 'integer', { required: true }), field('next_attempt_at', 'datetime'), field('sent_at', 'datetime'),
    field('last_error', 'text'), field('lock_token', 'string'), field('locked_by', 'string'), field('locked_at', 'datetime'),
    field('handled_by', 'string'), field('handled_at', 'datetime'), field('manual_note', 'text'), field('activity_log', 'json'),
    field('date_created', 'datetime', { special: 'date-created', readonly: true }),
    field('date_updated', 'datetime', { special: 'date-updated', readonly: true })
  ], { status: 'pending', publication_state: 'private' }),
  content('lead_upload_sessions', [
    field('upload_reference', 'string', { required: true, unique: true }), field('file_name', 'string', { required: true }),
    field('mime_type', 'string', { required: true }), field('byte_size', 'integer', { required: true }), field('file_id', 'string'),
    field('expires_at', 'datetime', { required: true }), field('lead_reference', 'string')
  ], { status: 'pending', publication_state: 'private' }),
  content('content_versions', [
    field('content_collection', 'string', { required: true }), field('content_item_id', 'string', { required: true }),
    field('source_status', 'string', { required: true }), field('source_publication_state', 'string', { required: true }),
    field('snapshot', 'json', { required: true }), field('changed_fields', 'json', { required: true }), field('action', 'string', { required: true }),
    field('actor', 'string', { required: true }), field('created_at', 'datetime', { required: true }), field('restore_note', 'text'), field('restored_by', 'string'), field('restored_at', 'datetime')
  ], { status: 'available', publication_state: 'private' }),
  // Public product reads can be pinned to one immutable snapshot so that
  // lists, detail pages, and comparison never mix independently published rows.
  content('product_release_snapshots', [
    field('release_key', 'string', { required: true }), field('version', 'integer', { required: true }),
    field('source_hash', 'string', { required: true }), field('snapshot', 'json', { required: true }),
    field('release_note', 'text'), field('cache_invalidation_status', 'string', { required: true }),
    field('cache_invalidation_attempts', 'integer', { required: true }), field('cache_invalidation_last_attempt_at', 'datetime'),
    field('cache_invalidated_at', 'datetime'), field('cache_invalidation_error', 'string'),
    field('restored_from_release_id', 'string'), field('restored_from_version', 'integer'), field('restore_note', 'text')
  ], {
    status: 'published', publication_state: 'published', cache_invalidation_status: 'pending', cache_invalidation_attempts: 0
  }),
  content('site_settings', [
    field('setting_key', 'string', { required: true }), field('navigation', 'json'), field('footer', 'json'),
    field('brand', 'json'), field('contacts', 'json'), field('languages', 'json'), field('analytics', 'json')
  ]),
  {
    name: 'content_preview_tokens',
    fields: [
      field('token_hash', 'string', { required: true, unique: true }),
      field('content_collection', 'string', { required: true }),
      field('content_item_id', 'string', { required: true }),
      field('issued_by', 'string', { required: true }),
      field('created_at', 'datetime', { required: true }),
      field('expires_at', 'datetime', { required: true }),
      field('used_at', 'datetime'),
      field('revoked_at', 'datetime'),
      field('revoked_by', 'string'),
      field('use_count', 'integer', { required: true }),
      field('status', 'string', { required: true }),
      field('publication_state', 'string', { required: true })
    ],
    defaultValues: { status: 'active', publication_state: 'private', use_count: 0 }
  }
]);

export function publishedFilter(record, now = new Date()) {
  return record?.status === 'published'
    && record?.publication_state === 'published'
    && (!record.published_at || new Date(record.published_at) <= now);
}
