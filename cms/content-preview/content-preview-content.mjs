import { contentCollections } from '../schema/content-model.mjs';
import { normalizeFieldPresentations } from '../extensions/content-editor-workbench/src/section-presentation.js';

// Draft previews are deliberately smaller than a Directus record.  The preview
// endpoint is a bearer-token boundary, so never forward source evidence,
// publication audit fields, private contacts, or arbitrary custom fields.
const previewFields = Object.freeze({
  homepage_sections: ['id', 'page_key', 'section_key', 'title', 'kicker', 'body', 'content', 'media', 'sort_order', 'enabled', 'language', 'status', 'publication_state', 'published_at'],
  pages: ['id', 'slug', 'title', 'language', 'sections', 'seo', 'status', 'publication_state', 'published_at'],
  repair_page_configs: ['id', 'page_key', 'title', 'intro', 'hero_asset', 'model_cards', 'action_cards', 'process_steps', 'notices', 'faq_refs', 'seo', 'language', 'status', 'publication_state', 'published_at'],
  product_series: ['id', 'series_code', 'slug', 'name', 'positioning', 'presentation', 'scenarios', 'capabilities', 'cover_asset', 'sort_order', 'language', 'status', 'publication_state', 'published_at'],
  product_models: ['id', 'series_code', 'model_code', 'slug', 'name', 'parameters', 'parameter_groups', 'configuration', 'presentation', 'media', 'resources', 'case_studies', 'status', 'publication_state', 'published_at'],
  product_parameters: ['id', 'model_code', 'group_name', 'field_name', 'value', 'unit', 'presentation', 'sort_order', 'test_conditions', 'status', 'publication_state', 'published_at'],
  case_studies: ['id', 'slug', 'industry', 'material', 'thickness', 'model_code', 'process', 'result', 'authorization_status', 'status', 'publication_state', 'published_at'],
  articles: ['id', 'slug', 'category', 'title', 'display_date', 'summary', 'body', 'transcript', 'field_presentation', 'media', 'video_url', 'cover_asset', 'seo', 'status', 'publication_state', 'published_at'],
  manufacturing_evidence: ['id', 'source_key', 'process', 'description', 'media', 'inspection_evidence', 'sort_order', 'status', 'publication_state', 'published_at'],
  qualifications: ['id', 'source_key', 'type', 'name', 'certificate_number', 'issuer', 'valid_until', 'assets', 'sort_order', 'authorization_status', 'status', 'publication_state', 'published_at'],
  milestones: ['id', 'source_key', 'year', 'event', 'evidence', 'media', 'icon_asset', 'sort_order', 'status', 'publication_state', 'published_at'],
  service_resources: ['id', 'source_key', 'type', 'title', 'summary', 'body', 'applicable_models', 'version', 'language', 'asset', 'cover_asset', 'display_date', 'sort_order', 'updated_at', 'status', 'publication_state', 'published_at'],
  service_locations: ['id', 'source_key', 'region', 'city', 'service_scope', 'business_status', 'valid_until', 'status', 'publication_state', 'published_at'],
  knowledge_items: ['id', 'source_key', 'visibility', 'channel', 'category', 'question_title', 'applicable_models', 'error_codes', 'symptoms', 'troubleshooting_steps', 'risk_level', 'safety_preconditions', 'escalation_guidance', 'media', 'version', 'technical_reviewer', 'dify_sync_status', 'status', 'publication_state', 'published_at'],
  external_service_entries: ['id', 'entry_type', 'url', 'enabled', 'open_mode', 'health_status', 'status', 'publication_state', 'published_at'],
  site_settings: ['id', 'setting_key', 'navigation', 'footer', 'brand', 'contacts', 'languages', 'analytics', 'status', 'publication_state', 'published_at']
});

const structuredPreviewFields = new Map(contentCollections.map((collection) => [
  collection.name,
  new Set(collection.fields.filter((field) => field.type === 'json').map((field) => field.name))
]));

function parseStructuredPreviewValue(collection, field, value) {
  if (!structuredPreviewFields.get(collection)?.has(field) || typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function clonePreviewValue(value) {
  if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  // Directus returns date fields as Date instances in the Node runtime. Keep
  // them as ISO strings so the preview contract remains JSON-serializable.
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  if (Array.isArray(value)) return value.map(clonePreviewValue);
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clonePreviewValue(entry)]));
  return null;
}

function cleanSectionValue(value, depth = 0) {
  if (depth > 2 || value == null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.slice(0, 100).map((entry) => cleanSectionValue(entry, depth + 1));
  if (typeof value !== 'object') return null;
  const allowed = new Set(['id', 'key', 'label', 'title', 'body', 'description', 'kicker', 'shortTitle', 'introTitle', 'introDetail', 'image', 'icon', 'video', 'introImage', 'mode', 'href', 'items', 'links', 'media', 'pagination', 'layout', 'text_style', 'responsive', 'media_presentation', 'field_presentation', 'sort_order', 'order', 'enabled', 'alt', 'role', 'media_role', 'media_asset_id', 'poster_asset_id', 'anchor', 'connection_label', 'assistant_eyebrow', 'assistant_brand', 'assistant_brand_short', 'assistant_title', 'assistant_heading', 'assistant_intro', 'assistant_cta', 'assistant_empty', 'assistant_loading', 'assistant_input_placeholder', 'assistant_send_label', 'assistant_send', 'assistant_stop', 'assistant_dialog_label', 'assistant_close', 'assistant_answer_label', 'assistant_matched_label', 'assistant_human_label', 'assistant_entry', 'assistant_direct_entry', 'step_1_title', 'step_1_body', 'step_2_title', 'step_2_body', 'step_3_title', 'step_3_body', 'feedback_prompt', 'feedback_yes', 'feedback_no', 'handoff_consent', 'handoff_summary_label', 'handoff_summary_placeholder', 'handoff_continue', 'handoff_draft', 'map_eyebrow', 'map_title', 'map_choice_label', 'map_close_label', 'map_amap_label', 'map_amap_description', 'map_baidu_label', 'map_baidu_description', 'map_system_label', 'map_system_description', 'exit_eyebrow', 'exit_title', 'exit_body', 'exit_cancel', 'exit_continue', 'exit_confirm', 'human_support_label', 'online_title', 'online_intro', 'assistant_copy_json',
    // Repeated cards share the bounded presentation schema used by sections.
    'template', 'align_x', 'align_y', 'width', 'gap', 'z_index', 'desktop', 'mobile', 'offset_x', 'offset_y', 'number', 'map_media_role', 'offices',
    'preset', 'weight', 'size_desktop', 'size_mobile', 'line_height', 'color', 'max_width',
    'desktop_visible', 'tablet_visible', 'mobile_visible', 'mobile_template',
    'fit', 'focal_x', 'focal_y', 'overlay']);
  const presentationFields = ['title', 'label', 'body', 'description', 'connection_label', 'field_name', 'value', 'unit', 'name', 'positioning', 'caption'];
  return Object.fromEntries(Object.entries(value).filter(([key]) => allowed.has(key)).map(([key, entry]) => [key,
    key === 'field_presentation' ? normalizeFieldPresentations(entry, presentationFields) : cleanSectionValue(entry, depth + 1)
  ]));
}

function previewSection(section) {
  if (!section || typeof section !== 'object') return null;
  // These fields have their own server-side normalizer.  Keeping the same
  // controlled contract in the preview makes position and typography edits
  // visible without exposing arbitrary CSS or internal editorial metadata.
  const allowed = [
    'id', 'kicker', 'title', 'body', 'description', 'label', 'href', 'shortTitle', 'introTitle', 'introDetail',
    'image', 'icon', 'video', 'introImage', 'mode', 'content', 'items', 'links', 'media', 'pagination',
    'layout', 'text_style', 'responsive', 'media_presentation', 'field_presentation', 'requires_claim_review'
  ];
  const preview = Object.fromEntries(allowed
    .filter((field) => Object.hasOwn(section, field))
    .map((field) => [field, field === 'field_presentation'
      ? normalizeFieldPresentations(section[field], Object.keys(section))
      : ['content', 'items', 'links', 'media'].includes(field) ? cleanSectionValue(section[field]) : clonePreviewValue(section[field])]));
  // The homepage hero owns this persisted media reference. Keep the exception
  // scoped to that section so draft previews cannot expose arbitrary fields.
  if (section.id === 'hero' && Object.hasOwn(section, 'hero_video_asset_id')) {
    preview.hero_video_asset_id = clonePreviewValue(section.hero_video_asset_id);
    const previewPath = typeof section.hero_video_asset_url === 'string' ? section.hero_video_asset_url.trim() : '';
    if (/^\/api\/preview\/media\/[1-9]\d*$/.test(previewPath)) preview.hero_video_asset_url = previewPath;
  }
  return preview;
}

function previewProductParameterPresentation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const fields = normalizeFieldPresentations(value.field_presentation, ['field_name', 'value', 'unit']);
  return Object.keys(fields).length ? { field_presentation: fields } : undefined;
}

function previewProductSeriesPresentation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const fields = normalizeFieldPresentations(value.field_presentation, ['name', 'positioning']);
  return Object.keys(fields).length ? { field_presentation: fields } : undefined;
}

function previewProductModelPresentation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const fields = normalizeFieldPresentations(value.field_presentation, ['model_code']);
  return Object.keys(fields).length ? { field_presentation: fields } : undefined;
}

export function previewContentRecord(collection, record) {
  const fields = previewFields[collection];
  if (!fields || !record || typeof record !== 'object') return null;
  const result = {};
  for (const field of fields) {
    if (!Object.hasOwn(record, field)) continue;
    const value = parseStructuredPreviewValue(collection, field, record[field]);
    result[field] = field === 'sections'
      ? (Array.isArray(value) ? value.map(previewSection).filter(Boolean) : [])
      : collection === 'product_parameters' && field === 'presentation'
        ? previewProductParameterPresentation(value)
        : collection === 'product_series' && field === 'presentation'
          ? previewProductSeriesPresentation(value)
          : collection === 'product_models' && field === 'presentation'
            ? previewProductModelPresentation(value)
          : collection === 'articles' && field === 'field_presentation'
            ? normalizeFieldPresentations(value, ['category', 'title', 'display_date', 'summary', 'body', 'transcript'])
          : clonePreviewValue(value);
  }
  return result;
}

export function previewCollectionFields(collection) {
  return previewFields[collection] ? [...previewFields[collection]] : [];
}
