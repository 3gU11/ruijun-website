// Pure data-shape helpers for the content editor workbench.
//
// Extracted verbatim from module.vue: these functions convert CMS records into the
// editable draft shapes the workbench binds to, and back again. They hold no
// component state and touch no DOM, so they live in a module instead of inside a
// 5600-line single-file component. Behaviour is unchanged — see
// test/content-editor-workbench-draft-shapes.test.mjs.
import { normalizePageMediaReferences } from './page-media-references.js';
import { normalizeFieldPresentations, normalizeSectionPresentation } from './section-presentation.js';
import { cloneVisualSnapshot } from './visual-editing-history.js';
import { mergeVisualSiteSettingsDefaults } from './site-settings-visual-defaults.js';
import { normalizeProductModelFeaturePresentation } from './product-model-presentation.js';

export function cloneVisualState(value) {
  return cloneVisualSnapshot(value);
}

export function remapVisualListPath(path, arrayPath, previousIndex, nextIndex) {
  const parts = String(path || '').trim().split('.').filter(Boolean);
  const arrayParts = String(arrayPath || '').trim().split('.').filter(Boolean);
  if (arrayParts.length && arrayParts.every((part, index) => parts[index] === part) && parts[arrayParts.length] === String(previousIndex)) {
    parts[arrayParts.length] = String(nextIndex);
  }
  return parts.join('.');
}

export function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function parseObject(value, fallback = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return clone(value);
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback; } catch { return fallback; }
  }
  return fallback;
}

export function parseArray(value) {
  if (Array.isArray(value)) return clone(value);
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
}

export function textList(value) {
  return parseArray(value).map((item) => typeof item === 'string' ? item.trim() : '').filter(Boolean).join('\n');
}

export function contentListText(value) {
  return parseArray(value).map((item) => {
    if (typeof item === 'string') return item.trim();
    return typeof item?.content === 'string' ? item.content.trim() : '';
  }).filter(Boolean).join('\n');
}

export function knowledgeSteps(record) {
  const steps = parseArray(record.troubleshooting_steps);
  if (steps.length === 1 && steps[0] && typeof steps[0] === 'object' && typeof steps[0].content === 'string') {
    return { text: steps[0].content, type: String(steps[0].type || 'manual_step') };
  }
  return { text: contentListText(steps), type: 'manual_step' };
}

export function normalizePageMedia(value) {
  return normalizePageMediaReferences(parseArray(value));
}

export function normalizeSections(value) {
  return parseArray(value).filter((section) => section && typeof section === 'object').map((section) => ({
    ...section,
    id: String(section.id || ''),
    kicker: typeof section.kicker === 'string' ? section.kicker : '',
    label: typeof section.label === 'string' ? section.label : '',
    title: typeof section.title === 'string' ? section.title : '',
    body: typeof section.body === 'string' ? section.body : '',
    description: typeof section.description === 'string' ? section.description : '',
    content: parseObject(section.content),
    value: typeof section.value === 'number' && Number.isFinite(section.value) ? section.value : (typeof section.value === 'string' ? section.value : ''),
    unit: typeof section.unit === 'string' ? section.unit : '',
    items: parseArray(section.items).map((item, itemIndex) => ({
      ...item,
      sort_order: Number.isInteger(Number(item?.sort_order)) ? Number(item.sort_order) : itemIndex,
      ...normalizeSectionPresentation(item)
    })),
    media: normalizePageMedia(section.media),
    pagination: normalizePagination(section.pagination),
    ...normalizeSectionPresentation(section)
  }));
}

export function normalizePagination(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const pageSize = Number(source.page_size);
  return {
    page_size: Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= 6 ? pageSize : 6,
    sort: ['manual', 'published_at_desc', 'sort_order_asc'].includes(source.sort) ? source.sort : 'manual',
    previous_label: String(source.previous_label || '上一页').slice(0, 120),
    next_label: String(source.next_label || '下一页').slice(0, 120),
    empty_label: String(source.empty_label || '').slice(0, 120)
  };
}

export function normalizeSeries(record) {
  const presentationSource = parseObject(record.presentation);
  const fieldPresentation = normalizeFieldPresentations(presentationSource.field_presentation, ['name', 'positioning']);
  return {
    ...clone(record),
    presentation: Object.keys(fieldPresentation).length ? { field_presentation: fieldPresentation } : {},
    scenariosText: textList(record.scenarios), capabilitiesText: textList(record.capabilities),
    sort_order: Number.isFinite(Number(record.sort_order)) ? Number(record.sort_order) : 0
  };
}

export function normalizeMediaReferences(value) {
  const seen = new Set();
  return parseArray(value).flatMap((entry) => {
    const mediaAssetId = typeof entry?.media_asset_id === 'string' || Number.isSafeInteger(entry?.media_asset_id)
      ? String(entry.media_asset_id).trim() : '';
    if (!mediaAssetId || seen.has(mediaAssetId)) return [];
    seen.add(mediaAssetId);
    return [{ media_asset_id: mediaAssetId }];
  });
}

export function normalizeModel(record) {
  const source = parseObject(record.configuration);
  const labels = parseObject(source.labels);
  const fieldPresentation = normalizeProductModelFeaturePresentation(source);
  return {
    ...clone(record),
    configurationSource: clone(source),
    configuration: {
      intro: {
        title: String(source.intro?.title || ''),
        subtitle: String(source.intro?.subtitle || ''),
        scene: String(source.intro?.scene || ''),
        body: String(source.intro?.body || '')
      },
      machine_asset_id: String(source.machine_asset_id || ''),
      labels: {
        technical: String(labels.technical || ''),
        drawing: String(labels.drawing || ''),
        technical_image_asset_id: String(labels.technical_image_asset_id || '')
      },
      features: parseArray(source.features).map((item) => ({ label: String(item?.label || ''), detail: String(item?.detail || ''), note: String(item?.note || ''), image: String(item?.image || ''), media_asset_id: String(item?.media_asset_id || '') })),
      drawings: parseArray(source.drawings).map((item) => ({ title: String(item?.title || item?.label || ''), caption: String(item?.caption || item?.description || ''), media_asset_id: String(item?.media_asset_id || '') })),
      ...(Object.keys(fieldPresentation).length ? { field_presentation: fieldPresentation } : {})
    },
    resources: parseArray(record.resources).map((item) => ({ title: String(item?.title || ''), type: String(item?.type || ''), url: String(item?.url || item?.path || ''), media_asset_id: String(item?.media_asset_id || '') })),
    mediaReferences: normalizeMediaReferences(record.media)
  };
}

export function emptyParameter() {
  return { group_name: '', field_name: '', value: '', unit: '', sort_order: 0, test_conditions: '' };
}

export function emptyMediaDraft() {
  return {
    file: null, usage_scope: 'product', media_type: '', placement_key: '', page_key: '', section_key: '',
    width: 0, height: 0, duration_seconds: 0, aspect_ratio: '', poster_asset_id: '', sort_order: 0,
    enabled: true, autoplay: false, muted: true, loop: false, title: '', description: '', transcript: '',
    copyright_status: 'owned', alt_text: '', authorization_note: ''
  };
}

export function greatestCommonDivisor(left, right) {
  let a = Math.abs(Math.round(left)); let b = Math.abs(Math.round(right));
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function mediaTypeForFile(file) {
  if (String(file?.type || '').startsWith('image/')) return 'image';
  if (String(file?.type || '').startsWith('video/')) return 'video';
  if (file?.type === 'application/pdf') return 'document';
  return '';
}

export function normalizeLink(value) {
  const link = parseObject(value);
  return { ...link, label: String(link.label || ''), href: String(link.href || '') };
}

export function boundedFooterStyleNumber(value, minimum, maximum, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, minimum), maximum) : fallback;
}

export function normalizeFooterTextStyles(value) {
  const source = parseObject(value);
  return Object.fromEntries(footerTextStyleDefinitions.map(({ id }) => {
    const style = parseObject(source[id]);
    const color = /^#[0-9a-f]{6}$/i.test(String(style.color || '').trim()) ? String(style.color).trim().toUpperCase() : '';
    return [id, {
      enabled: style.enabled === true,
      weight: [300, 400, 500, 700, 800].includes(Number(style.weight)) ? Number(style.weight) : 400,
      size_desktop: boundedFooterStyleNumber(style.size_desktop, 12, 72, 16),
      size_mobile: boundedFooterStyleNumber(style.size_mobile, 12, 40, 14),
      line_height: boundedFooterStyleNumber(style.line_height, 1, 2.2, 1.35),
      color
    }];
  }));
}

export function normalizeSettings(record) {
  const visualDefaults = mergeVisualSiteSettingsDefaults(record);
  const footer = parseObject(visualDefaults.footer);
  const brand = parseObject(record.brand);
  const contacts = parseObject(visualDefaults.contacts);
  const headerCta = parseObject(contacts.header_cta);
  const columns = parseArray(footer.columns).map((column, index) => ({
    title: String(column?.title || ''),
    sort_order: Number.isFinite(Number(column?.sort_order)) ? Number(column.sort_order) : index,
    links: parseArray(column?.links).map(normalizeLink)
  }));
  return {
    ...clone(record),
    navigation: parseArray(record.navigation).map(normalizeLink),
    footer: { ...footer, primary_links: parseArray(footer.primary_links).map(normalizeLink), columns, text_styles: normalizeFooterTextStyles(footer.text_styles), purchase_label: String(footer.purchase_label || ''), purchase_title: String(footer.purchase_title || ''), purchase_subtitle: String(footer.purchase_subtitle || ''), purchase_phone: String(footer.purchase_phone || ''), copyright: String(footer.copyright || ''), address_icon_asset: String(footer.address_icon_asset || ''), phone_icon_asset: String(footer.phone_icon_asset || ''), email_icon_asset: String(footer.email_icon_asset || ''), requires_business_review: footer.requires_business_review === true },
    brand: { ...brand, display_name: String(brand.display_name || ''), logo_asset: String(brand.logo_asset || ''), footer_logo_asset: String(brand.footer_logo_asset || '') },
    contacts: { ...contacts, service_phone: String(contacts.service_phone || ''), domestic_phone: String(contacts.domestic_phone || ''), export_phone: String(contacts.export_phone || ''), domestic_email: String(contacts.domestic_email || ''), export_email: String(contacts.export_email || ''), language_label: String(contacts.language_label || ''), addressesText: textList(contacts.addresses), header_cta: { ...headerCta, label: String(headerCta.label || ''), href: String(headerCta.href || '') } },
    languagesText: textList(record.languages)
  };
}

export function normalizeOptionalSortOrder(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : null;
}

export function normalizeArticle(record) {
  const seo = parseObject(record.seo);
  const publishedAt = String(record.published_at || '').slice(0, 10);
  const displayDate = String(record.display_date || publishedAt).slice(0, 10);
  return { ...clone(record), category: record.category === 'video' ? 'video' : 'news', display_date: displayDate, sort_order: normalizeOptionalSortOrder(record.sort_order), published_at: publishedAt, transcript: String(record.transcript || ''), body_media_text: JSON.stringify(Array.isArray(record.body_media) ? record.body_media : [], null, 2), mediaReferences: normalizeMediaReferences(record.media), seo: { ...seo, title: typeof seo.title === 'string' ? seo.title : '', description: typeof seo.description === 'string' ? seo.description : '', keywords: Array.isArray(seo.keywords) ? seo.keywords.join(', ') : String(seo.keywords || '') } };
}

export function normalizeKnowledge(record) {
  const steps = knowledgeSteps(record);
  return {
    ...clone(record),
    applicableModelsText: textList(record.applicable_models),
    errorCodesText: textList(record.error_codes),
    troubleshootingStepsText: steps.text,
    troubleshootingStepType: steps.type,
    safetyPreconditionsText: contentListText(record.safety_preconditions),
    mediaReferences: normalizeMediaReferences(record.media),
    symptoms: String(record.symptoms || ''),
    escalation_guidance: String(record.escalation_guidance || ''),
    version: String(record.version || ''),
    technical_reviewer: String(record.technical_reviewer || '')
  };
}

export function isPageMediaOption(assetId, scope) {
  return pageMediaOptions(scope).some((asset) => String(asset.id) === String(assetId));
}

export function isPageMediaOptionForSection(assetId, scope, section) {
  return isPageMediaOption(assetId, scope)
    && pageMediaOptionsForSection(scope, section).some((asset) => String(asset.id) === String(assetId));
}

export function reviewedMediaAssetsForPlacement(scope, placementKey) {
  return reviewedMediaAssets(scope).filter((asset) => asset.placement_key === placementKey);
}

export function apiStatus(reason) {
  return Number(reason?.response?.status || reason?.status || 0);
}

export function normalizeReviewRecord(definition, record) {
  const [primaryField, secondaryField] = definition.fields;
  return {
    id: record.id,
    collection: definition.collection,
    collectionLabel: definition.label,
    label: String(record[primaryField] || record[secondaryField] || `${definition.label} ${record.id}`),
    secondary: String(record[secondaryField] || ''),
    status: record.status,
    publication_state: record.publication_state,
    review_note: String(record.review_note || '')
  };
}

export function defaultPageMediaRole(section, assetId) {
  const asset = pageMediaOptions(pageMediaScope()).find((candidate) => String(candidate.id) === String(assetId));
  const placement = String(asset?.placement_key || '').trim().toLowerCase();
  const tail = placement ? placement.split('.').pop() : '';
  // The homepage machine slot is registered as `…machine` but bound as
  // `foreground`, so translate it instead of storing the placement tail.
  if (tail === 'machine') return 'foreground';
  if (pageMediaSlotRoles.has(tail)) return tail;
  // No confident placement signal: fall back to what the section renders.
  if (section?.mode === 'machine') return 'foreground';
  if (section?.mode === 'photo') return 'background';
  return '';
}

export function registeredSectionList(section, field) {
  if (!Array.isArray(section[field.key])) section[field.key] = [];
  return section[field.key];
}

export function normalizeRepairPage(record) {
  const copy = clone(record);
  for (const key of ['model_cards', 'action_cards', 'process_steps', 'notices', 'faq_refs', 'seo']) {
    const value = copy[key];
    copy[`${key}_text`] = JSON.stringify(value ?? (key === 'seo' ? {} : []), null, 2);
  }
  return copy;
}

export function nextServiceKey(prefix) {
  return `${prefix}-${Date.now()}`;
}

export function nextDraftSlug(prefix) {
  return `cms-editor-${prefix}-${Date.now()}`;
}

// Narrowing the submission/review queues. These live here rather than inline in
// the component so the matching rules are unit-testable: the queues routinely hold
// 600+ drafts across 15 collections, and a filter that silently matches nothing
// looks identical to a queue that is genuinely empty.
export function queueCollectionOptions(records) {
  const counts = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    const key = String(record?.collection || '');
    if (!key) continue;
    const entry = counts.get(key) || { value: key, label: record.collectionLabel || key, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh'));
}

export function filterQueueRecords(records, { query = '', collection = '' } = {}) {
  const needle = String(query ?? '').trim().toLowerCase();
  const wanted = String(collection ?? '').trim();
  return (Array.isArray(records) ? records : []).filter((record) => {
    if (wanted && String(record?.collection || '') !== wanted) return false;
    if (!needle) return true;
    // Match how an operator would refer to a record: its visible name, its
    // secondary identifier, or the content type it belongs to.
    return [record?.label, record?.secondary, record?.collectionLabel]
      .some((field) => String(field ?? '').toLowerCase().includes(needle));
  });
}

// The footer text-style catalogue. Lives here because normalizeFooterTextStyles
// below reads it, and it must not be defined in the component that also consumes
// it: a module referencing a constant that only exists in the SFC resolves at
// runtime to a ReferenceError that surfaces far away, on the first
// loadSettings() call.
export const footerTextStyleDefinitions = Object.freeze([
  ['products', '产品中心标题'], ['workstation', '灵动切割工作站'], ['auto', 'FR-XS(auto)'], ['pro', 'FR-XS(pro)'], ['ft', 'FT-XS(pro)'], ['fr-y', 'FR-Y'], ['fl', 'FL-XS(pro)'],
  ['manufacturing', '先进智造标题'], ['cnc', 'CNC车间'], ['metal', '钣金车间'], ['assembly', '装配车间'], ['about', '关于我们标题'], ['honors', '荣誉资质认证'], ['history', '品牌发展历程'],
  ['address-changshu', '常熟工厂地址'], ['address-kunshan', '昆山工厂地址'], ['phone', '服务热线'], ['email-domestic', '国内邮箱'], ['email-export', '外贸邮箱'],
  ['purchase-title', '采购区按钮文案'], ['purchase-copy', '采购区标题与说明'], ['purchase-phone', '采购联系电话']
].map(([id, label]) => Object.freeze({ id, label })));
