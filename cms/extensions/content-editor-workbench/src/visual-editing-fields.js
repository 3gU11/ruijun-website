const blockedPathParts = new Set(['__proto__', 'prototype', 'constructor']);
const scalarMediaFields = new Set([
  'asset', 'cover_asset', 'hero_asset', 'icon_asset', 'image', 'icon', 'video',
  'poster', 'background', 'introImage', 'cover', 'media_asset_id', 'technical_image_asset_id', 'hero_video_asset_id'
  , 'logo_asset', 'footer_logo_asset', 'address_icon_asset', 'phone_icon_asset', 'email_icon_asset'
]);
const restorableMediaFields = new Set(['logo_asset', 'footer_logo_asset', 'address_icon_asset', 'phone_icon_asset', 'email_icon_asset']);
const productProofValueSectionIds = new Set(['proof-efficiency', 'proof-years']);
const visualReorderableArrays = new Set(['items', 'features']);
const visualReorderableItemFields = new Set(['title', 'label', 'description', 'body', 'detail', 'note', 'connection_label', 'image', 'map']);

const visualFieldLengthLimits = Object.freeze({
  articles: Object.freeze({ title: 240, summary: 1000, body: 30000, transcript: 30000 }),
  case_studies: Object.freeze({ industry: 160, material: 160, thickness: 120, process: 12000, result: 8000 }),
  service_resources: Object.freeze({ title: 240, summary: 1000, body: 20000 }),
  knowledge_items: Object.freeze({ question_title: 240, symptoms: 4000, escalation_guidance: 4000 }),
  product_series: Object.freeze({ name: 240, positioning: 1000, scenarios: 4000, capabilities: 4000 })
});

const homeReasonVisualDefaults = Object.freeze({
  performance: Object.freeze({
    kicker: '增效降损', shortTitle: '增效降损', introTitle: '增效降损',
    introDetail: '效能提升50%，丝损降低30%', mode: 'machine'
  }),
  'advanced-manufacturing': Object.freeze({
    kicker: '先进智造', shortTitle: '先进智造', introTitle: '先进智造',
    introDetail: '30年技术沉淀，先进制造工厂', mode: 'photo'
  }),
  'industry-leadership': Object.freeze({
    kicker: '领军品牌', shortTitle: '领军品牌', introTitle: '行业领军品牌',
    introDetail: '销量持续领先，品质始终如一', mode: 'photo'
  })
});

// Keep the workbench draft aligned with the visible product-page fallbacks.
// These fields are materialized locally only; Directus changes on explicit save.
const productProofVisualDefaults = Object.freeze({
  'proof-efficiency': Object.freeze({
    title: '50%', body: '产品效率性能提升', value: 50, unit: '%'
  }),
  'proof-years': Object.freeze({
    title: '30 YEARS', body: '30年技术沉淀，先进智造工厂', value: 30, unit: 'YEARS'
  }),
  'proof-champion': Object.freeze({
    title: 'Champion', body: '销量持续领先，品质始终如一'
  })
});

const productDimensionsVisualDefault = '注：1.表中所述加工性能参数是在本公司指定条件（材料、加工条件、环境、测量参数）下进行的实验结果　2.某些功能配置需要选装';

// Older page drafts only stored title/body. Materialize the fields rendered by
// the homepage so canvas edits always have a real, saveable JSON field path.
export function hydrateHomeReasonFields(section) {
  if (!section || typeof section !== 'object' || Array.isArray(section)) return section;
  const defaults = homeReasonVisualDefaults[String(section.id || '')];
  if (!defaults) return section;
  for (const [field, value] of Object.entries(defaults)) {
    if (!Object.hasOwn(section, field) || section[field] === undefined) section[field] = value;
  }
  return section;
}

export function hydrateProductProofFields(section) {
  if (!section || typeof section !== 'object' || Array.isArray(section)) return section;
  const defaults = productProofVisualDefaults[String(section.id || '')];
  if (!defaults) return section;
  for (const [field, value] of Object.entries(defaults)) {
    const isLegacyEmptyNumeric = (field === 'value' || field === 'unit') && section[field] === '';
    if (!Object.hasOwn(section, field) || section[field] === undefined || isLegacyEmptyNumeric) section[field] = value;
  }
  return section;
}

export function hydrateProductDimensionsFields(section) {
  if (!section || typeof section !== 'object' || Array.isArray(section) || String(section.id || '') !== 'dimensions') return section;
  if (!String(section.body || '').trim()) section.body = productDimensionsVisualDefault;
  return section;
}

// Legacy service drafts predate the phone field, but the public page exposes
// an editable empty-phone placeholder. Materialize that leaf before canvas
// editing so it is included in the page draft submitted to Directus.
export function hydrateServiceOfficeFields(section) {
  if (!section || typeof section !== 'object' || Array.isArray(section) || String(section.id || '') !== 'office-directory') return section;
  if (!Array.isArray(section.items)) return section;
  for (let index = 0; index < section.items.length; index += 1) {
    const region = section.items[index];
    if (!region || typeof region !== 'object' || Array.isArray(region)) continue;
    // Nuxt renders these stable fallback roles for legacy office records. Keep
    // the draft contract identical so a canvas media selection has a governed
    // persistence target instead of attempting to replace static display URLs.
    if (!String(region.media_role || '').trim()) region.media_role = `office-${index + 1}`;
    if (!String(region.map_media_role || '').trim()) region.map_media_role = `office-map-${index + 1}`;
    if (!Array.isArray(region.offices)) continue;
    for (const office of region.offices) {
      if (office && typeof office === 'object' && !Array.isArray(office) && !Object.hasOwn(office, 'phone')) office.phone = '';
    }
  }
  return section;
}

// The service footer renders this fallback even when legacy drafts do not
// contain a support label. Materialize it before canvas editing so the
// selected visible text has a real field to update and persist.
export function hydrateServiceSupportFields(section) {
  if (!section || typeof section !== 'object' || Array.isArray(section) || String(section.id || '') !== 'support') return section;
  if (!section.content || typeof section.content !== 'object' || Array.isArray(section.content)) section.content = {};
  const defaults = {
    human_support_label: '需要人工协助？',
    online_title: '在线售后服务',
    online_intro: '不需要预先判断应该进入哪个系统。先让 AI 确认设备情况和服务目标，再在需要提交或查询时打开对应页面。',
    assistant_brand: 'RUIJUN AI SERVICE DESK',
    assistant_heading: '先描述问题\n剩下交给 AI',
    assistant_intro: '报修资料、保修核验和维修进度由服务助手逐步引导。维修系统只用于提交申请与查询状态。',
    assistant_cta: '开始服务咨询',
    step_1_title: '说明设备或服务需求',
    step_1_body: '可直接输入机型、故障现象、进度或保修问题。',
    step_2_title: '由 AI 确认办理路径',
    step_2_body: '先得到资料清单与流程说明，避免无效提交。',
    step_3_title: '需要时再进入维修系统',
    step_3_body: '提交工单、核验保修或查询进度均在独立系统完成。',
    faq_title: '常见服务问题',
    faq_intro: '先了解办理流程，再决定是否进入售后系统。涉及具体设备状态时，以售后工程师确认结果为准。',
    faq_1_question: '报修前需要准备哪些资料？',
    faq_1_answer: '设备型号与铭牌照片、机床编号、故障发生时间、故障现象、报警信息、现场照片或视频，以及联系人和联系电话。',
    faq_1_cta: '继续咨询 AI',
    faq_2_question: '在哪里发起维修申请？',
    faq_2_answer: '先由 AI 确认所需资料；需要提交时，服务助手会打开独立售后系统的维修申请页面。',
    faq_2_cta: '继续咨询 AI',
    faq_3_question: '在哪里查看维修进度？',
    faq_3_answer: '服务助手会引导你进入售后系统查看审核、补充资料、维修处理、寄回物流和归档状态。',
    faq_3_cta: '继续咨询 AI',
    faq_4_question: '如何核验保修状态？',
    faq_4_answer: '准备设备型号和机床编号，再由服务助手提供售后系统入口。',
    faq_4_cta: '继续咨询 AI',
    contact_title: '联系瑞钧',
    contact_intro: '售后服务请使用上方 AI 服务台。设备选型和工厂来访可在此咨询，AI 会先整理信息，再引导至合适的后续安排。',
    contact_sales_eyebrow: 'AI SALES CONSULTATION',
    contact_sales_title: '设备选型与方案',
    contact_sales_body: '输入工件尺寸、材料、精度、锥度、批量和自动化需求，AI 先帮你整理选型要点。',
    contact_sales_cta: '咨询 AI 助手',
    contact_visit_eyebrow: 'AI FACTORY VISIT',
    contact_visit_title: '工厂来访安排',
    contact_visit_body: '询问常熟或昆山工厂地址、来访前准备事项和接待安排，再确认合适的参观时间。',
    contact_visit_cta: '询问来访安排'
  };
  for (const [field, value] of Object.entries(defaults)) {
    if (!Object.hasOwn(section.content, field) || section.content[field] === undefined) section.content[field] = value;
  }
  return section;
}

// A service action starts with the existing website icon until an editor picks
// a governed asset. Materialized empty slots make every one of the eight
// visible icons independently selectable on the desktop canvas.
export function hydrateServiceActionMediaFields(section) {
  if (!section || typeof section !== 'object' || Array.isArray(section) || String(section.id || '') !== 'support-actions') return section;
  if (!Array.isArray(section.items)) return section;
  if (!Array.isArray(section.media)) section.media = [];
  for (let index = 0; index < Math.min(section.items.length, 8); index += 1) {
    const item = section.items[index];
    const role = String(item?.media_role || `action-${index + 1}`).trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(role)) continue;
    if (!section.media.some((entry) => entry && typeof entry === 'object' && String(entry.role || '').trim().toLowerCase() === role)) {
      section.media.push({ role, media_asset_id: '' });
    }
  }
  return section;
}

function pathParts(fieldPath) {
  const parts = String(fieldPath || '').trim().split('.').filter(Boolean);
  if (!parts.length || parts.length > 6) return null;
  if (parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part) || blockedPathParts.has(part))) return null;
  return parts;
}

function resolveParent(target, fieldPath) {
  const parts = pathParts(fieldPath);
  if (!target || typeof target !== 'object' || !parts) return null;
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    if (cursor == null || typeof cursor !== 'object' || !Object.hasOwn(cursor, part)) return null;
    cursor = cursor[part];
  }
  if (cursor == null || typeof cursor !== 'object') return null;
  return { cursor, key: parts.at(-1), parts };
}

export function resolveVisualFieldTarget(record, selection = {}) {
  if (!record || typeof record !== 'object') return null;
  if (String(selection.collection || '') !== 'pages') return record;
  const sectionKey = String(selection.sectionKey || '').trim();
  if (!sectionKey || !Array.isArray(record.sections)) return null;
  return record.sections.find((section) => String(section?.id || '') === sectionKey) || null;
}

export function getVisualFieldValue(target, fieldPath) {
  const parts = pathParts(fieldPath);
  if (!target || !parts) return '';
  let cursor = target;
  for (const part of parts) {
    if (cursor == null || typeof cursor !== 'object' || !Object.hasOwn(cursor, part)) return '';
    cursor = cursor[part];
  }
  return cursor == null ? '' : typeof cursor === 'string' ? cursor : JSON.stringify(cursor);
}

// The media picker must reflect the selected canvas slot's current asset.
// Media can be stored as a scalar asset id or as a governed relation object.
function findGovernedMediaEntry(target, mediaSlot) {
  const slot = governedMediaSlot(mediaSlot);
  if (!slot || !Array.isArray(target?.media)) return null;
  const index = target.media.findIndex((entry) => entry && typeof entry === 'object' && !Array.isArray(entry)
    && String(entry.role || '').trim().toLowerCase() === slot);
  return index >= 0 ? { index, entry: target.media[index] } : null;
}

export function getVisualMediaAssetId(target, fieldPath, { mediaSlot = '' } = {}) {
  const governed = findGovernedMediaEntry(target, mediaSlot);
  if (governed) return String(governed.entry.media_asset_id || '').trim();
  const resolved = resolveParent(target, fieldPath);
  if (!resolved || !Object.hasOwn(resolved.cursor, resolved.key)) return '';
  const value = resolved.cursor[resolved.key];
  if (resolved.key === 'image' && resolved.parts.at(-3) === 'features' && resolved.cursor.media_asset_id != null) return String(resolved.cursor.media_asset_id || '').trim();
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return String(value.media_asset_id || '').trim();
  }
  const fieldName = resolved.parts.at(-1);
  const parentField = resolved.parts.at(-2);
  const isMediaListEntry = /^\d+$/.test(fieldName) && (parentField === 'media' || parentField === 'assets');
  return scalarMediaFields.has(fieldName) || isMediaListEntry
    ? (typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '')
    : '';
}

// The canvas property panel must preserve the validated limits used by the
// corresponding Directus form. Long-form article content is not a short label.
export function visualFieldMaxLength(selection = {}) {
  const collection = String(selection.collection || '').trim();
  const fieldPath = String(selection.fieldPath || '').trim();
  return visualFieldLengthLimits[collection]?.[fieldPath] || 4000;
}

// Canvas clicks are selection events, not permission to discard the form's
// current draft. Keep the existing draft only for its exact record.
export function shouldKeepVisualDraft(current = {}, selection = {}) {
  const collection = String(selection.collection || '').trim();
  const itemId = String(selection.itemId || '').trim();
  return Boolean(
    collection
    && itemId
    && collection === String(current.collection || '').trim()
    && itemId === String(current.itemId || '').trim()
    && current.draft
    && String(current.draft.id || '').trim() === itemId
  );
}

// Canvas sorting is deliberately limited to a directly bound card/node/feature
// field. Nested records such as office contacts keep their own order and are
// not reordered accidentally when an address is selected.
export function getVisualListReorder(target, fieldPath) {
  const parts = pathParts(fieldPath);
  if (!target || !parts || parts.length < 3) return null;
  let cursor = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    if (cursor == null || typeof cursor !== 'object' || !Object.hasOwn(cursor, part)) return null;
    cursor = cursor[part];
    if (!Array.isArray(cursor)) continue;
    const itemPart = parts[index + 1];
    const leafField = parts[index + 2];
    if (!visualReorderableArrays.has(part) || !/^\d+$/.test(itemPart) || !visualReorderableItemFields.has(leafField) || parts.length !== index + 3) return null;
    const itemIndex = Number(itemPart);
    if (!Number.isSafeInteger(itemIndex) || itemIndex < 0 || itemIndex >= cursor.length) return null;
    return { arrayPath: parts.slice(0, index + 1).join('.'), index: itemIndex, length: cursor.length };
  }
  return null;
}

function resolveVisualReorderArray(target, arrayPath) {
  let cursor = target;
  for (const part of String(arrayPath || '').split('.').filter(Boolean)) {
    if (cursor == null || typeof cursor !== 'object' || !Object.hasOwn(cursor, part)) return null;
    cursor = cursor[part];
  }
  return Array.isArray(cursor) ? cursor : null;
}

export function moveVisualListItem(target, fieldPath, direction) {
  const reorder = getVisualListReorder(target, fieldPath);
  const step = Number(direction);
  if (!reorder || !Number.isInteger(step) || ![-1, 1].includes(step)) return null;
  const nextIndex = reorder.index + step;
  if (nextIndex < 0 || nextIndex >= reorder.length) return null;
  const items = resolveVisualReorderArray(target, reorder.arrayPath);
  if (!items) return null;
  [items[reorder.index], items[nextIndex]] = [items[nextIndex], items[reorder.index]];
  if (items.every((item) => item && typeof item === 'object' && !Array.isArray(item) && Object.hasOwn(item, 'sort_order'))) {
    items.forEach((item, index) => { item.sort_order = index; });
  }
  const fieldPathParts = pathParts(fieldPath);
  const arrayPathParts = reorder.arrayPath.split('.');
  fieldPathParts[arrayPathParts.length] = String(nextIndex);
  return { ...reorder, index: nextIndex, fieldPath: fieldPathParts.join('.') };
}

function visualListResult(reorder, fieldPath, index, length) {
  const fieldPathParts = pathParts(fieldPath);
  const arrayPathParts = reorder.arrayPath.split('.');
  fieldPathParts[arrayPathParts.length] = String(index);
  return { arrayPath: reorder.arrayPath, index, length, fieldPath: fieldPathParts.join('.') };
}

function normalizeVisualListSortOrder(items) {
  if (items.every((item) => item && typeof item === 'object' && !Array.isArray(item) && Object.hasOwn(item, 'sort_order'))) {
    items.forEach((item, index) => { item.sort_order = index; });
  }
}

function nextVisualListIdentity(items, field, value) {
  const source = String(value || '').trim();
  const match = source.match(/^(.*?)(\d+)$/);
  if (!match) return '';
  const [, prefix, digits] = match;
  const width = digits.length;
  let highest = Number(digits);
  const occupied = new Set();
  for (const item of items) {
    const candidate = String(item?.[field] || '').trim();
    const candidateMatch = candidate.match(/^(.*?)(\d+)$/);
    if (!candidateMatch || candidateMatch[1] !== prefix) continue;
    const number = Number(candidateMatch[2]);
    if (!Number.isSafeInteger(number)) continue;
    highest = Math.max(highest, number);
    occupied.add(candidate);
  }
  let next = highest + 1;
  let candidate = `${prefix}${String(next).padStart(width, '0')}`;
  while (occupied.has(candidate)) {
    next += 1;
    candidate = `${prefix}${String(next).padStart(width, '0')}`;
  }
  return candidate;
}

function assignDuplicateVisualListIdentities(items, copy) {
  for (const field of ['number', 'media_role', 'map_media_role']) {
    if (!Object.hasOwn(copy, field)) continue;
    const next = nextVisualListIdentity(items, field, copy[field]);
    if (next) copy[field] = next;
  }
}

// Duplicating an already visible card gives editors a safe starting point
// without manufacturing a new template shape from the canvas layer.
export function duplicateVisualListItem(target, fieldPath) {
  const reorder = getVisualListReorder(target, fieldPath);
  if (!reorder) return null;
  const items = resolveVisualReorderArray(target, reorder.arrayPath);
  const current = items?.[reorder.index];
  if (!items || !current || typeof current !== 'object' || Array.isArray(current)) return null;
  let copy;
  try {
    copy = JSON.parse(JSON.stringify(current));
  } catch {
    return null;
  }
  assignDuplicateVisualListIdentities(items, copy);
  const nextIndex = reorder.index + 1;
  items.splice(nextIndex, 0, copy);
  normalizeVisualListSortOrder(items);
  return visualListResult(reorder, fieldPath, nextIndex, items.length);
}

// A canvas deletion must never leave a template array empty. Editors can use
// the structured form when a section itself is intentionally being removed.
export function removeVisualListItem(target, fieldPath) {
  const reorder = getVisualListReorder(target, fieldPath);
  if (!reorder || reorder.length <= 1) return null;
  const items = resolveVisualReorderArray(target, reorder.arrayPath);
  if (!items) return null;
  items.splice(reorder.index, 1);
  normalizeVisualListSortOrder(items);
  return visualListResult(reorder, fieldPath, Math.min(reorder.index, items.length - 1), items.length);
}

export function setVisualFieldValue(target, fieldPath, value) {
  const resolved = resolveParent(target, fieldPath);
  if (!resolved || !Object.hasOwn(resolved.cursor, resolved.key)) return false;
  const current = resolved.cursor[resolved.key];
  const isProductProofValue = resolved.key === 'value' && productProofValueSectionIds.has(String(target?.id || ''));
  if (typeof current === 'number' || isProductProofValue) {
    const source = String(value ?? '').trim();
    const numeric = Number(source);
    if (!source || !Number.isFinite(numeric)) return false;
    resolved.cursor[resolved.key] = numeric;
    return true;
  }
  resolved.cursor[resolved.key] = value;
  return true;
}

function governedMediaSlot(value) {
  const slot = String(value || '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{0,79}$/.test(slot) ? slot : '';
}

function createGovernedMediaSlot(target, fieldPath, assetId, mediaSlot) {
  const match = String(fieldPath || '').match(/^media\.(\d+)$/);
  const slot = governedMediaSlot(mediaSlot);
  if (!match || !slot || !Array.isArray(target?.media)) return false;
  const index = Number(match[1]);
  if (!Number.isSafeInteger(index) || index < 0) return false;
  if (index === target.media.length) {
    target.media.push({ role: slot, media_asset_id: assetId });
    return true;
  }
  const current = target.media[index];
  if (!current || typeof current !== 'object' || Array.isArray(current) || String(current.role || '').trim().toLowerCase() !== slot) return false;
  current.media_asset_id = assetId;
  return true;
}

export function applyVisualMediaReplacement(target, fieldPath, assetId, { mediaSlot = '', allowEmpty = false } = {}) {
  const id = String(assetId || '').trim();
  const slot = governedMediaSlot(mediaSlot);
  // An empty governed slot means "use the original Nuxt icon". Other media
  // fields remain non-empty to keep their existing validation guarantees.
  if (slot) {
    if (id !== '' && !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id)) return false;
    const existing = findGovernedMediaEntry(target, slot);
    if (existing) {
      if (!id && allowEmpty) {
        target.media.splice(existing.index, 1);
        return true;
      }
      existing.entry.media_asset_id = id;
      return true;
    }
    // Repeated service cards expose items.N.image/map on the canvas, while
    // persistence is intentionally kept in section.media by role. Create the
    // governed slot only for a matching item media binding; never fall back to
    // mutating the display-only item field.
    const itemMatch = String(fieldPath || '').match(/^items\.(\d+)\.(image|map)$/);
    if (itemMatch && Array.isArray(target?.items)) {
      const item = target.items[Number(itemMatch[1])];
      const expectedRole = itemMatch[2] === 'map' ? item?.map_media_role : item?.media_role;
      if (String(expectedRole || '').trim().toLowerCase() === slot && Array.isArray(target.media)) {
        target.media.push({ role: slot, media_asset_id: id });
        return true;
      }
    }
    return createGovernedMediaSlot(target, fieldPath, id, slot);
  }
  const parts = pathParts(fieldPath);
  const replacementFieldName = parts?.at(-1);
  // Product model drawings may be edited from the fallback image before a
  // drawing record exists in configuration. Materialize the selected slot so
  // the visual editor can persist the first replacement instead of silently
  // treating the fallback as read-only.
  if (parts?.length === 4 && parts[0] === 'configuration' && parts[1] === 'drawings' && /^\d+$/.test(parts[2]) && parts[3] === 'media_asset_id' && target?.configuration && Array.isArray(target.configuration.drawings)) {
    const index = Number(parts[2]);
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id) || index > target.configuration.drawings.length) return false;
    if (!target.configuration.drawings[index] || typeof target.configuration.drawings[index] !== 'object') target.configuration.drawings[index] = { title: '', caption: '' };
    target.configuration.drawings[index].media_asset_id = id;
    return true;
  }
  if (!(/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id) || (!id && (allowEmpty || restorableMediaFields.has(replacementFieldName))))) return false;
  const resolved = resolveParent(target, fieldPath);
  if (!resolved || !Object.hasOwn(resolved.cursor, resolved.key)) return false;
  const current = resolved.cursor[resolved.key];
  if (resolved.key === 'image' && resolved.parts.at(-3) === 'features' && Object.hasOwn(resolved.cursor, 'media_asset_id')) {
    resolved.cursor.media_asset_id = id;
    return true;
  }
  const fieldName = resolved.parts.at(-1);
  const parentField = resolved.parts.at(-2);
  if (/^\d+$/.test(fieldName) && parentField === 'assets' && current && typeof current === 'object' && !Array.isArray(current)) {
    current.media_asset_id = id;
    delete current.path;
    return true;
  }
  if (current && typeof current === 'object' && !Array.isArray(current) && Object.hasOwn(current, 'media_asset_id')) {
    current.media_asset_id = id;
    return true;
  }
  if (/^\d+$/.test(fieldName) && parentField === 'media' && current && typeof current === 'object' && !Array.isArray(current)) {
    current.media_asset_id = id;
    return true;
  }
  if (/^\d+$/.test(fieldName) && Array.isArray(resolved.cursor) && (current == null || typeof current === 'string' || typeof current === 'number')) {
    resolved.cursor[resolved.key] = id;
    return true;
  }
  if (scalarMediaFields.has(fieldName) && (current == null || typeof current === 'string' || typeof current === 'number')) {
    resolved.cursor[resolved.key] = id;
    return true;
  }
  return false;
}

// Some PSD-backed galleries use a button as the transparent hit target. An
// explicit `media.<index>` path is a governed replacement target even if a
// cross-frame selection message drops its media-role metadata. Ordinary CTAs
// retain their text controls because they never use this media-list path.
export function isVisualMediaSelection(selection = {}) {
  const elementType = String(selection.elementType || '').trim();
  if (elementType === 'image' || elementType === 'video') return true;
  const mediaRole = String(selection.mediaRole || '').trim();
  const fieldPath = String(selection.fieldPath || '').trim();
  if (mediaRole && /^media\.\d+$/.test(fieldPath)) return true;
  return Boolean(elementType === 'button' && /^media\.\d+$/.test(fieldPath));
}
