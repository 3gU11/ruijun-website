// Draft previews are deliberately smaller than a Directus record.  The preview
// endpoint is a bearer-token boundary, so never forward source evidence,
// publication audit fields, private contacts, or arbitrary custom fields.
const previewFields = Object.freeze({
  pages: ['id', 'slug', 'title', 'language', 'sections', 'seo', 'status', 'publication_state', 'published_at'],
  product_series: ['id', 'series_code', 'slug', 'name', 'positioning', 'scenarios', 'capabilities', 'cover_asset', 'sort_order', 'language', 'status', 'publication_state', 'published_at'],
  product_models: ['id', 'series_code', 'model_code', 'slug', 'name', 'parameters', 'configuration', 'media', 'resources', 'case_studies', 'status', 'publication_state', 'published_at'],
  product_parameters: ['id', 'model_code', 'group_name', 'field_name', 'value', 'unit', 'sort_order', 'test_conditions', 'status', 'publication_state', 'published_at'],
  case_studies: ['id', 'slug', 'industry', 'material', 'thickness', 'model_code', 'process', 'result', 'authorization_status', 'status', 'publication_state', 'published_at'],
  articles: ['id', 'slug', 'category', 'title', 'summary', 'body', 'video_url', 'cover_asset', 'seo', 'status', 'publication_state', 'published_at'],
  manufacturing_evidence: ['id', 'source_key', 'process', 'description', 'media', 'inspection_evidence', 'sort_order', 'status', 'publication_state', 'published_at'],
  qualifications: ['id', 'source_key', 'type', 'name', 'certificate_number', 'issuer', 'valid_until', 'assets', 'sort_order', 'authorization_status', 'status', 'publication_state', 'published_at'],
  milestones: ['id', 'source_key', 'year', 'event', 'evidence', 'sort_order', 'status', 'publication_state', 'published_at'],
  service_resources: ['id', 'source_key', 'type', 'applicable_models', 'version', 'language', 'asset', 'updated_at', 'status', 'publication_state', 'published_at'],
  // Contact details are intentionally excluded from draft previews. They are
  // governed service data and should only be shown through the approved page.
  service_locations: ['id', 'source_key', 'region', 'city', 'service_scope', 'business_status', 'valid_until', 'status', 'publication_state', 'published_at'],
  knowledge_items: ['id', 'source_key', 'visibility', 'channel', 'category', 'question_title', 'applicable_models', 'error_codes', 'symptoms', 'troubleshooting_steps', 'risk_level', 'safety_preconditions', 'escalation_guidance', 'media', 'version', 'technical_reviewer', 'dify_sync_status', 'status', 'publication_state', 'published_at'],
  external_service_entries: ['id', 'entry_type', 'url', 'enabled', 'open_mode', 'health_status', 'status', 'publication_state', 'published_at'],
  site_settings: ['id', 'setting_key', 'navigation', 'footer', 'brand', 'languages', 'analytics', 'status', 'publication_state', 'published_at']
});

function clonePreviewValue(value) {
  if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(clonePreviewValue);
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clonePreviewValue(entry)]));
  return null;
}

function previewSection(section) {
  if (!section || typeof section !== 'object') return null;
  const allowed = ['id', 'kicker', 'title', 'body', 'media', 'requires_claim_review'];
  return Object.fromEntries(allowed
    .filter((field) => Object.hasOwn(section, field))
    .map((field) => [field, clonePreviewValue(section[field])]));
}

export function previewContentRecord(collection, record) {
  const fields = previewFields[collection];
  if (!fields || !record || typeof record !== 'object') return null;
  const result = {};
  for (const field of fields) {
    if (!Object.hasOwn(record, field)) continue;
    result[field] = field === 'sections'
      ? (Array.isArray(record[field]) ? record[field].map(previewSection).filter(Boolean) : [])
      : clonePreviewValue(record[field]);
  }
  return result;
}

export function previewCollectionFields(collection) {
  return previewFields[collection] ? [...previewFields[collection]] : [];
}

