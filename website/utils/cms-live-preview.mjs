import { normalizeFieldPresentations } from '../shared/section-presentation.mjs';

export const CMS_LIVE_PREVIEW_UPDATE = 'ruijun:cms-preview:update';
export const CMS_LIVE_PREVIEW_READY = 'ruijun:cms-preview:ready';
export const CMS_LIVE_PREVIEW_EXPIRED = 'ruijun:cms-preview:expired';
export const CMS_LIVE_PREVIEW_EDIT_REQUEST = 'ruijun:cms-preview:edit-request';
export const CMS_LIVE_PREVIEW_EDIT_COMMIT = 'ruijun:cms-preview:edit-commit';
export const CMS_LIVE_PREVIEW_MEDIA_REPLACE = 'ruijun:cms-preview:media-replace';
export const CMS_LIVE_PREVIEW_COMMAND = 'ruijun:cms-preview:command';
export const CMS_LIVE_PREVIEW_READONLY = 'ruijun:cms-preview:readonly';

export function cmsPreviewSectionSelector(value) {
  const key = String(value || '').trim();
  if (!/^[a-z0-9][a-z0-9_-]{0,79}$/i.test(key)) return '';
  return `[data-cms-preview-key="${key}"]`;
}

// Editing targets stay below the workbench toolbar. Ordinary preview retains
// its centered positioning and therefore does not change public page layout.
export function cmsPreviewScrollOptions({ visualEditMode = false } = {}) {
  return visualEditMode
    ? { behavior: 'auto', block: 'start', inline: 'nearest' }
    : { behavior: 'auto', block: 'center', inline: 'nearest' };
}

// The session target is the record used to open the iframe. A live canvas can
// later select another authorized related record, so status text must describe
// that active record rather than the original token label.
export function cmsPreviewStatusLabel({ collection = '', record = null, fallbackLabel = '当前草稿' } = {}) {
  const value = record && typeof record === 'object' && !Array.isArray(record) ? record : {};
  const fallback = String(fallbackLabel || '当前草稿').trim() || '当前草稿';
  const text = (...values) => values.map((item) => String(item || '').trim()).filter(Boolean).join(' ');
  if (collection === 'milestones') return text(value.year, value.event) || fallback;
  if (collection === 'product_models') return text(value.model_code, value.name) || fallback;
  if (collection === 'product_series') return text(value.series_code, value.name) || fallback;
  if (collection === 'service_locations') return text(value.region, value.city) || fallback;
  return String(value.title || value.name || value.source_key || value.slug || '').trim() || fallback;
}

export function makeCmsPreviewRecordRenderable(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record) || !Array.isArray(record.sections)) return record;
  return {
    ...record,
    sections: record.sections.map((section) => section && typeof section === 'object'
      ? { ...section, requires_claim_review: false }
      : section)
  };
}

export function resolveCmsVisualRootBinding({ rootCollection = '', rootItemId = '', sessionCollection = '', sessionItemId = '' } = {}) {
  const sessionName = String(sessionCollection || '').trim();
  const sessionId = String(sessionItemId ?? '').trim();
  const explicitName = String(rootCollection || '').trim();
  const explicitId = String(rootItemId ?? '').trim();
  if (!sessionName || !sessionId) return null;
  if (explicitName || explicitId) {
    if (!explicitName || !explicitId || explicitName !== sessionName || explicitId !== sessionId) return null;
    return { collection: explicitName, itemId: explicitId };
  }
  return sessionName === 'pages' ? { collection: sessionName, itemId: sessionId } : null;
}

// Nested business roots (for example a product card inside a page section)
// own their fields over the containing page root.
export function resolveCmsVisualElementBinding({ elementCollection = '', elementItemId = '', rootCollection = '', rootItemId = '', sessionCollection = '', sessionItemId = '' } = {}) {
  const sessionName = String(sessionCollection || '').trim();
  const sessionId = String(sessionItemId ?? '').trim();
  const elementName = String(elementCollection || '').trim();
  const elementId = String(elementItemId ?? '').trim();
  const validElement = /^[a-z][a-z0-9_]{0,79}$/i.test(elementName) && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(elementId);
  if (validElement && (elementName !== sessionName || elementId !== sessionId)) return { collection: elementName, itemId: elementId };
  const rootName = String(rootCollection || '').trim();
  const rootId = String(rootItemId ?? '').trim();
  if (/^[a-z][a-z0-9_]{0,79}$/i.test(rootName) && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(rootId)) return { collection: rootName, itemId: rootId };
  if (validElement && elementName === sessionName && elementId === sessionId) {
    return { collection: elementName, itemId: elementId };
  }
  return resolveCmsVisualRootBinding({ sessionCollection, sessionItemId });
}

export function normalizeCmsLivePreviewOrigins(value) {
  const candidates = Array.isArray(value) ? value : String(value || '').split(',');
  const origins = [];
  for (const candidate of candidates) {
    try {
      const url = new URL(String(candidate || '').trim());
      if (!['http:', 'https:'].includes(url.protocol) || url.origin === 'null' || origins.includes(url.origin)) continue;
      origins.push(url.origin);
    } catch {
      // Ignore malformed configuration instead of weakening the origin check.
    }
  }
  return origins;
}

// Chromium can omit Location.ancestorOrigins for an iframe even when it has a
// normal same-origin referrer. Keep the postMessage target constrained to the
// configured allowlist instead of dropping canvas-selection events silently.
export function resolveCmsLivePreviewParentOrigin({ ancestorOrigin = '', referrer = '', allowedOrigin = '' } = {}) {
  const allowedOrigins = normalizeCmsLivePreviewOrigins(allowedOrigin);
  const ancestor = String(ancestorOrigin || '').trim();
  if (allowedOrigins.includes(ancestor)) return ancestor;
  try {
    const referrerOrigin = new URL(String(referrer || '')).origin;
    if (allowedOrigins.includes(referrerOrigin)) return referrerOrigin;
  } catch {
    // A missing or malformed referrer is not a valid postMessage destination.
  }
  return allowedOrigins[0] || '';
}

export function normalizeCmsLivePreviewMediaUrl(value, allowedOrigin) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\/assets\/[A-Za-z0-9._~%/-]+$/.test(raw) && !raw.slice('/assets/'.length).split('/').some((part) => part === '.' || part === '..' || !part)) return raw;
  try {
    const url = new URL(raw);
    const origins = normalizeCmsLivePreviewOrigins(allowedOrigin);
    if (!origins.includes(url.origin) || !url.pathname.startsWith('/assets/') || url.pathname.slice('/assets/'.length).split('/').some((part) => part === '.' || part === '..' || !part)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

export function applyCmsLivePreviewMediaElement(element, replacement) {
  if (!element || !replacement?.mediaUrl) return false;
  const url = String(replacement.mediaUrl).trim();
  const role = String(replacement.mediaRole || '').trim();
  if (!url) return false;
  if (element.matches?.('img')) {
    element.src = url;
    if ('srcset' in element) element.srcset = '';
  } else if (element.matches?.('video')) {
    element.src = url;
    if (replacement.posterUrl) element.poster = String(replacement.posterUrl);
    element.load?.();
  } else if (role === 'background' || element.style) {
    element.style.backgroundImage = `url("${url.replace(/"/g, '\\"')}")`;
  } else {
    return false;
  }
  if (element.dataset) element.dataset.cmsPreviewMediaAssetId = String(replacement.mediaAssetId || '');
  return true;
}

const controlledMediaRoles = new Set([
  'image', 'video', 'background', 'cover', 'poster', 'icon', 'gallery', 'asset',
  'technical', 'drawing', 'equipment', 'feature', 'machine', 'map', 'foreground', 'logo'
]);
const controlledPreviewCommands = new Set(['align']);
const controlledAlignModes = new Set(['left', 'center', 'right']);

function isPreviewSessionValid(session, now) {
  const expiresAt = Date.parse(session?.expiresAt || '');
  return Boolean(session?.collection && session.itemId != null && Number.isFinite(expiresAt) && expiresAt > now);
}

export function isCmsLivePreviewSessionExpired(session, now = Date.now()) {
  return !isPreviewSessionValid(session, now);
}

function isSafePreviewFieldPath(value) {
  const path = String(value || '').trim();
  if (!path || path.length > 240 || !/^[A-Za-z0-9_]+(?:\.(?:[A-Za-z0-9_]+|\d+))*$/.test(path)) return false;
  return !path.split('.').some((part) => ['__proto__', 'prototype', 'constructor'].includes(part));
}

function isSafeControlledId(value) {
  const id = String(value || '').trim();
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id);
}

function isSafePlacementKey(value) {
  const key = String(value || '').trim();
  return /^(?=.{1,128}$)[A-Za-z0-9][A-Za-z0-9_-]*(?:\.[A-Za-z0-9][A-Za-z0-9_-]*)*$/.test(key);
}

export function createCmsVisualEditRequest({ editMode = false, device = 'desktop', tool = 'select', sectionKey = '', meta = null } = {}) {
  if (!editMode || device !== 'desktop' || !meta || typeof meta !== 'object') return null;
  const normalizedTool = String(tool || 'select').trim();
  const normalizedSectionKey = String(sectionKey || '').trim();
  const collection = String(meta.collection || '').trim();
  const itemId = String(meta.itemId ?? '').trim();
  const fieldPath = String(meta.fieldPath || '').trim();
  const elementType = String(meta.elementType || '').trim();
  const mediaRole = String(meta.mediaRole || '').trim();
  const mediaSlot = String(meta.mediaSlot || '').trim().toLowerCase();
  const positionFieldPath = String(meta.positionFieldPath || '').trim();
  const linkFieldPath = String(meta.linkFieldPath || '').trim();
  const groupRecordIds = Array.isArray(meta.groupRecordIds)
    ? meta.groupRecordIds.map((value) => String(value || '').trim())
    : [];
  if (!['select', 'text', 'media'].includes(normalizedTool)) return null;
  if (!/^[a-z0-9][a-z0-9_-]{0,79}$/i.test(normalizedSectionKey)) return null;
  if (!/^[a-z][a-z0-9_]{0,79}$/i.test(collection) || !isSafeControlledId(itemId) || !isSafePreviewFieldPath(fieldPath)) return null;
  if (!['text', 'image', 'video', 'button'].includes(elementType)) return null;
  const isText = elementType === 'text' || elementType === 'button';
  const isMedia = ['image', 'video'].includes(elementType) || controlledMediaRoles.has(mediaRole);
  if ((normalizedTool === 'text' && !isText) || (normalizedTool === 'media' && !isMedia)) return null;
  if (mediaRole && !controlledMediaRoles.has(mediaRole)) return null;
  if (mediaSlot && !/^[a-z0-9][a-z0-9-]{0,79}$/.test(mediaSlot)) return null;
  if (positionFieldPath && !isSafePreviewFieldPath(positionFieldPath)) return null;
  if (linkFieldPath && (elementType !== 'button' || !isSafePreviewFieldPath(linkFieldPath))) return null;
  if (groupRecordIds.length && (groupRecordIds.length > 32 || groupRecordIds.some((value) => !isSafeControlledId(value)))) return null;
  const placementKey = String(meta.placementKey || '').trim();
  if (placementKey && !isSafePlacementKey(placementKey)) return null;
  const request = {
    type: CMS_LIVE_PREVIEW_EDIT_REQUEST,
    sectionKey: normalizedSectionKey,
    field: fieldPath,
    fieldPath,
    label: String(meta.label || fieldPath).trim().slice(0, 80),
    collection,
    itemId,
    ...(positionFieldPath ? { positionFieldPath } : {}),
    ...(linkFieldPath ? { linkFieldPath } : {}),
    ...(groupRecordIds.length ? { groupRecordIds } : {}),
    elementType,
    ...(mediaRole ? { mediaRole } : {}),
    ...(mediaSlot ? { mediaSlot } : {}),
    ...(meta.allowDefaultMedia === true ? { allowDefaultMedia: true } : {}),
    ...(placementKey ? { placementKey } : {})
  };
  if (meta.textStyle && typeof meta.textStyle === 'object') request.textStyle = meta.textStyle;
  if (meta.rect && typeof meta.rect === 'object') request.rect = meta.rect;
  return request;
}

export function acceptCmsLivePreviewMediaReplaceMessage({ event, allowedOrigin, session, parentWindow, now = Date.now() }) {
  const allowedOrigins = normalizeCmsLivePreviewOrigins(allowedOrigin);
  const data = event?.data;
  if (!event || (parentWindow && event.source !== parentWindow) || !allowedOrigins.includes(event.origin) || data?.type !== CMS_LIVE_PREVIEW_MEDIA_REPLACE) return null;
  if (!isPreviewSessionValid(session, now)) return null;
  if (String(data.collection) !== String(session.collection) || String(data.itemId) !== String(session.itemId)) return null;
  const sectionKey = String(data.sectionKey || '').trim();
  const mediaRole = String(data.mediaRole || '').trim();
  if (!/^[a-z0-9][a-z0-9_-]{0,79}$/i.test(sectionKey) || !isSafePreviewFieldPath(data.fieldPath) || !controlledMediaRoles.has(mediaRole) || !isSafeControlledId(data.mediaAssetId)) return null;
  const mediaUrl = normalizeCmsLivePreviewMediaUrl(data.mediaUrl, allowedOrigin);
  const posterUrl = normalizeCmsLivePreviewMediaUrl(data.posterUrl, allowedOrigin);
  if ((data.mediaUrl && !mediaUrl) || (data.posterUrl && !posterUrl)) return null;
  return { sectionKey, fieldPath: String(data.fieldPath).trim(), mediaRole, mediaAssetId: String(data.mediaAssetId).trim(), ...(mediaUrl ? { mediaUrl } : {}), ...(posterUrl ? { posterUrl } : {}) };
}

export function acceptCmsLivePreviewCommand({ event, allowedOrigin, session, parentWindow, now = Date.now() }) {
  const allowedOrigins = normalizeCmsLivePreviewOrigins(allowedOrigin);
  const data = event?.data;
  if (!event || (parentWindow && event.source !== parentWindow) || !allowedOrigins.includes(event.origin) || data?.type !== CMS_LIVE_PREVIEW_COMMAND) return null;
  if (!isPreviewSessionValid(session, now)) return null;
  if (String(data.collection) !== String(session.collection) || String(data.itemId) !== String(session.itemId)) return null;
  const command = String(data.command || '').trim();
  const sectionKey = String(data.sectionKey || '').trim();
  const fieldPath = String(data.fieldPath || '').trim();
  const mode = String(data.mode || '').trim();
  if (!controlledPreviewCommands.has(command) || !/^[a-z0-9][a-z0-9_-]{0,79}$/i.test(sectionKey) || !isSafePreviewFieldPath(fieldPath) || !controlledAlignModes.has(mode)) return null;
  return { command, sectionKey, fieldPath, mode };
}

const previewFields = Object.freeze({
  pages: ['id', 'slug', 'title', 'language', 'sections', 'seo', 'status', 'publication_state', 'published_at'],
  repair_page_configs: ['id', 'page_key', 'title', 'intro', 'hero_asset', 'model_cards', 'action_cards', 'process_steps', 'notices', 'faq_refs', 'seo', 'language', 'status', 'publication_state', 'published_at'],
  product_series: ['id', 'series_code', 'slug', 'name', 'positioning', 'presentation', 'scenarios', 'capabilities', 'cover_asset', 'sort_order', 'language', 'status', 'publication_state', 'published_at'],
  product_models: ['id', 'series_code', 'model_code', 'slug', 'name', 'parameters', 'parameter_groups', 'configuration', 'media', 'resources', 'case_studies', 'status', 'publication_state', 'published_at'],
  product_parameters: ['id', 'model_code', 'group_name', 'field_name', 'value', 'unit', 'sort_order', 'test_conditions', 'status', 'publication_state', 'published_at'],
  case_studies: ['id', 'slug', 'industry', 'material', 'thickness', 'model_code', 'process', 'result', 'authorization_status', 'status', 'publication_state', 'published_at'],
  articles: ['id', 'slug', 'category', 'title', 'display_date', 'summary', 'body', 'transcript', 'field_presentation', 'media', 'video_url', 'cover_asset', 'cover_media_asset_id', 'seo', 'status', 'publication_state', 'published_at'],
  manufacturing_evidence: ['id', 'source_key', 'process', 'description', 'media', 'inspection_evidence', 'sort_order', 'status', 'publication_state', 'published_at'],
  qualifications: ['id', 'source_key', 'type', 'name', 'certificate_number', 'issuer', 'valid_until', 'assets', 'sort_order', 'authorization_status', 'status', 'publication_state', 'published_at'],
  milestones: ['id', 'source_key', 'year', 'event', 'evidence', 'sort_order', 'status', 'publication_state', 'published_at'],
  service_resources: ['id', 'source_key', 'type', 'title', 'summary', 'body', 'applicable_models', 'version', 'language', 'asset', 'cover_asset', 'asset_media_asset_id', 'cover_media_asset_id', 'display_date', 'sort_order', 'updated_at', 'status', 'publication_state', 'published_at'],
  service_locations: ['id', 'source_key', 'region', 'city', 'service_scope', 'business_status', 'valid_until', 'status', 'publication_state', 'published_at'],
  knowledge_items: ['id', 'source_key', 'visibility', 'channel', 'category', 'question_title', 'applicable_models', 'error_codes', 'symptoms', 'troubleshooting_steps', 'risk_level', 'safety_preconditions', 'escalation_guidance', 'media', 'version', 'technical_reviewer', 'dify_sync_status', 'status', 'publication_state', 'published_at'],
  external_service_entries: ['id', 'entry_type', 'url', 'enabled', 'open_mode', 'health_status', 'status', 'publication_state', 'published_at'],
  site_settings: ['id', 'setting_key', 'navigation', 'footer', 'brand', 'contacts', 'languages', 'analytics', 'status', 'publication_state', 'published_at']
});

function cloneValue(value) {
  if (value == null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.map(cloneValue);
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
  return null;
}

function cleanOfficeList(value) {
  if (!Array.isArray(value)) return [];
  const fields = ['source_key', 'city', 'address', 'manager', 'phone'];
  return value.slice(0, 100)
    .filter((office) => office && typeof office === 'object' && !Array.isArray(office))
    .map((office) => Object.fromEntries(fields
      .filter((field) => Object.hasOwn(office, field))
      .map((field) => [field, cloneValue(office[field])])))
    .filter((office) => typeof office.address === 'string' && office.address.trim());
}

function cleanSectionValue(value, depth = 0) {
  if (depth > 2 || value == null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.slice(0, 100).map((entry) => cleanSectionValue(entry, depth + 1));
  if (typeof value !== 'object') return null;
  const allowed = new Set(['id', 'key', 'label', 'title', 'body', 'description', 'detail', 'kicker', 'shortTitle', 'introTitle', 'introDetail', 'processTitle', 'outputText', 'value', 'unit', 'image', 'icon', 'video', 'introImage', 'mode', 'href', 'assistant_eyebrow', 'assistant_brand', 'assistant_brand_short', 'assistant_title', 'assistant_heading', 'assistant_intro', 'assistant_cta', 'assistant_empty', 'assistant_loading', 'assistant_input_placeholder', 'assistant_send_label', 'assistant_send', 'assistant_stop', 'assistant_dialog_label', 'assistant_close', 'assistant_answer_label', 'assistant_matched_label', 'assistant_human_label', 'assistant_entry', 'assistant_direct_entry', 'step_1_title', 'step_1_body', 'step_2_title', 'step_2_body', 'step_3_title', 'step_3_body', 'feedback_prompt', 'feedback_yes', 'feedback_no', 'handoff_consent', 'handoff_summary_label', 'handoff_summary_placeholder', 'handoff_continue', 'handoff_draft', 'exit_confirm', 'human_support_label', 'online_title', 'online_intro', 'assistant_copy_json',
    'faq_title', 'faq_intro', 'faq_1_question', 'faq_1_answer', 'faq_1_cta', 'faq_2_question', 'faq_2_answer', 'faq_2_cta', 'faq_3_question', 'faq_3_answer', 'faq_3_cta', 'faq_4_question', 'faq_4_answer', 'faq_4_cta',
    'contact_title', 'contact_intro', 'contact_sales_eyebrow', 'contact_sales_title', 'contact_sales_body', 'contact_sales_cta', 'contact_visit_eyebrow', 'contact_visit_title', 'contact_visit_body', 'contact_visit_cta',
    'items', 'links', 'media', 'pagination', 'layout', 'text_style', 'responsive', 'media_presentation', 'field_presentation', 'sort_order', 'order', 'enabled', 'alt', 'role', 'anchor', 'connection_label', 'path', 'managed', 'mediaType', 'posterPath', 'media_asset_id', 'poster_asset_id', 'media_role', 'map', 'map_media_role', 'offices',
    // Repeated cards own the same bounded presentation schema as sections.
    // Keep its scalar settings through the preview sanitizer, never arbitrary CSS.
    'template', 'align_x', 'align_y', 'width', 'gap', 'z_index', 'desktop', 'mobile', 'offset_x', 'offset_y',
    'preset', 'weight', 'size_desktop', 'size_mobile', 'line_height', 'color', 'max_width',
    'desktop_visible', 'tablet_visible', 'mobile_visible', 'mobile_template',
    'fit', 'focal_x', 'focal_y', 'overlay']);
  return Object.fromEntries(Object.entries(value).filter(([key]) => allowed.has(key)).map(([key, entry]) => [key, key === 'offices' ? cleanOfficeList(entry) : cleanSectionValue(entry, depth + 1)]));
}

function cleanSections(value) {
  if (!Array.isArray(value)) return [];
  const fields = [
    'id', 'kicker', 'title', 'body', 'description', 'detail', 'label', 'href', 'shortTitle', 'introTitle', 'introDetail', 'processTitle', 'outputText', 'value', 'unit',
    'image', 'icon', 'video', 'introImage', 'mode', 'content', 'items', 'links', 'media', 'pagination',
    'layout', 'text_style', 'responsive', 'media_presentation', 'field_presentation', 'requires_claim_review'
  ];
  return value.filter((section) => section && typeof section === 'object').map((section) => {
    const cleanSection = Object.fromEntries(fields
    .filter((field) => Object.hasOwn(section, field))
    .map((field) => [field, field === 'field_presentation'
      ? normalizeFieldPresentations(section[field], Object.keys(section))
      : ['content', 'items', 'links', 'media'].includes(field) ? cleanSectionValue(section[field]) : cloneValue(section[field])] ));
    // Match the CMS token sanitizer: this asset id is valid only for the
    // persisted homepage hero section and must survive postMessage updates.
    if (section.id === 'hero' && Object.hasOwn(section, 'hero_video_asset_id')) {
      cleanSection.hero_video_asset_id = cloneValue(section.hero_video_asset_id);
    }
    if (section.id === 'hero' && Object.hasOwn(section, 'hero_video_asset_url')) {
      cleanSection.hero_video_asset_url = cloneValue(section.hero_video_asset_url);
    }
    return cleanSection;
  });
}

function cleanProductSeriesPresentation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const fields = normalizeFieldPresentations(value.field_presentation, ['name', 'positioning']);
  return Object.keys(fields).length ? { field_presentation: fields } : undefined;
}

export function sanitizeCmsLivePreviewRecord(collection, record) {
  const fields = previewFields[String(collection || '')];
  if (!fields || !record || typeof record !== 'object' || Array.isArray(record)) return null;
  return Object.fromEntries(fields
    .filter((field) => Object.hasOwn(record, field))
    .map((field) => [field,
      field === 'sections' ? cleanSections(record[field])
        : collection === 'articles' && field === 'field_presentation' ? normalizeFieldPresentations(record[field], ['category', 'title', 'display_date', 'summary', 'body', 'transcript'])
        : collection === 'product_series' && field === 'presentation' ? cleanProductSeriesPresentation(record[field])
          : cloneValue(record[field])
    ]));
}

export function acceptCmsLivePreviewMessage({ event, allowedOrigin, session, now = Date.now() }) {
  const allowedOrigins = normalizeCmsLivePreviewOrigins(allowedOrigin);
  if (!event || !allowedOrigins.includes(event.origin) || event.data?.type !== CMS_LIVE_PREVIEW_UPDATE) return null;
  const expiresAt = Date.parse(session?.expiresAt || '');
  if (!session?.collection || session.itemId == null || !Number.isFinite(expiresAt) || expiresAt <= now) return null;
  const messageCollection = String(event.data.collection || '');
  const messageItemId = String(event.data.itemId ?? '');
  const primary = messageCollection === String(session.collection) && messageItemId === String(session.itemId);
  const related = Array.isArray(session?.preview?.related?.[messageCollection])
    && session.preview.related[messageCollection].some((record) => String(record?.id ?? '') === messageItemId);
  if (!primary && !related) return null;
  return sanitizeCmsLivePreviewRecord(messageCollection, event.data.preview);
}
