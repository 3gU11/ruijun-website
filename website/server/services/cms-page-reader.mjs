import { collectMediaAssetIds, createCmsMediaAssetResolver } from './cms-media-asset-resolver.mjs';
import { hasSectionPresentation, normalizeFieldPresentations, normalizeSectionPresentation } from './cms-section-presentation.mjs';

function isPublished(record, now) {
  if (record?.status !== 'published' || record?.publication_state !== 'published') return false;
  if (!record.published_at) return true;
  const publishedAt = Date.parse(record.published_at);
  return Number.isFinite(publishedAt) && publishedAt <= now;
}

const publicItemStringFields = Object.freeze(['id', 'key', 'source_key', 'label', 'title', 'body', 'description', 'kicker', 'number', 'query', 'media_role', 'map_media_role', 'role', 'alt', 'unit', 'value', 'date', 'year', 'category', 'anchor', 'connection_label']);

function publicHref(value) {
  const href = typeof value === 'string' ? value.trim() : '';
  return /^\/[A-Za-z0-9._~!$&'()*+,;=:@%/?#-]*$/.test(href) || /^https:\/\/[^\s]+$/i.test(href) ? href.slice(0, 1000) : '';
}

function publicMediaPath(value) {
  const path = typeof value === 'string' ? value.trim() : '';
  return /^\/[A-Za-z0-9._~!$&'()*+,;=:@%/?#-]*$/.test(path) || /^https:\/\/[^\s]+$/i.test(path) ? path.slice(0, 1000) : '';
}

function collectNestedMediaAssetIds(value, ids, depth = 0) {
  if (depth > 5 || value == null) return;
  if (typeof value === 'string') {
    try { collectNestedMediaAssetIds(JSON.parse(value), ids, depth + 1); } catch { /* legacy scalar content */ }
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value.slice(0, 100)) collectNestedMediaAssetIds(entry, ids, depth + 1);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'media_asset_id' || key === 'image_asset_id' || key === 'icon_asset_id' || key === 'poster_asset_id') {
      const id = String(entry ?? '').trim();
      if (id) ids.push(id);
      continue;
    }
    if (['content', 'items', 'links', 'media', 'assets'].includes(key)) collectNestedMediaAssetIds(entry, ids, depth + 1);
  }
}

function publicMediaEntries(value, mediaAssets) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const asset = mediaAssets.get(String(entry.media_asset_id || '').trim());
    const path = asset?.path || '';
    if (!path) return [];
    const posterAsset = mediaAssets.get(String(entry.poster_asset_id || '').trim());
    return [{
      path,
      ...(typeof entry.role === 'string' && entry.role.trim() ? { role: entry.role.trim().slice(0, 60) } : {}),
      ...(typeof entry.alt === 'string' && entry.alt.trim() ? { alt: entry.alt.trim().slice(0, 240) } : (asset?.alt ? { alt: asset.alt } : {})),
      mediaType: asset.mediaType,
      ...(asset.title ? { title: asset.title } : {}),
      ...(asset.description ? { description: asset.description } : {}),
      ...(posterAsset?.path ? { posterPath: posterAsset.path } : (asset.posterPath ? { posterPath: asset.posterPath } : {}))
    }];
  });
}

function publicItems(value, depth = 0, mediaAssets = new Map()) {
  if (!Array.isArray(value) || depth > 2) return [];
  return value.slice(0, 100).flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const copy = {};
    for (const field of publicItemStringFields) if (typeof item[field] === 'string') copy[field] = item[field].trim().slice(0, field === 'body' ? 20_000 : 1000);
    for (const field of ['sort_order', 'order']) if (Number.isSafeInteger(item[field])) copy[field] = item[field];
    for (const field of ['enabled', 'open_in_new_tab']) if (typeof item[field] === 'boolean') copy[field] = item[field];
    const href = publicHref(item.href);
    const image = publicMediaPath(item.image) || mediaAssets.get(String(item.image_asset_id || item.media_asset_id || '').trim())?.path;
    const icon = publicMediaPath(item.icon) || mediaAssets.get(String(item.icon_asset_id || '').trim())?.path;
    if (href) copy.href = href;
    if (image) copy.image = image;
    if (icon) copy.icon = icon;
    if (Array.isArray(item.items)) copy.items = publicItems(item.items, depth + 1, mediaAssets);
    if (Array.isArray(item.media)) copy.media = publicMediaEntries(item.media, mediaAssets);
    if (Array.isArray(item.offices)) copy.offices = item.offices.slice(0, 100).flatMap((office) => {
      if (!office || typeof office !== 'object') return [];
      return [{ source_key: String(office.source_key || '').trim().slice(0, 120), address: String(office.address || '').trim().slice(0, 500), manager: String(office.manager || '').trim().slice(0, 120), phone: String(office.phone || '').trim().slice(0, 80) }];
    });
    const presentation = hasSectionPresentation(item) ? normalizeSectionPresentation(item) : null;
    return Object.keys(copy).length || presentation ? [{ ...copy, ...(presentation || {}) }] : [];
  });
}

function publicPagination(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const pageSize = Number(value.page_size);
  const copy = {
    page_size: Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= 6 ? pageSize : 6,
    sort: ['manual', 'published_at_desc', 'sort_order_asc'].includes(value.sort) ? value.sort : 'manual'
  };
  for (const field of ['previous_label', 'next_label', 'empty_label']) {
    if (typeof value[field] === 'string') copy[field] = value[field].trim().slice(0, 120);
  }
  return copy;
}

function publicContent(value, mediaAssets = new Map()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const copy = {};
  for (const field of [
    ...publicItemStringFields,
    'shortTitle', 'introTitle', 'introDetail', 'mode', 'introImage',
    'assistant_eyebrow', 'assistant_brand', 'assistant_brand_short', 'assistant_title', 'assistant_heading', 'assistant_intro', 'assistant_cta',
    'assistant_empty', 'assistant_loading', 'assistant_input_placeholder', 'assistant_send_label', 'assistant_send', 'assistant_stop',
    'assistant_dialog_label', 'assistant_close', 'assistant_answer_label', 'assistant_matched_label', 'assistant_human_label', 'assistant_entry', 'assistant_direct_entry',
    'step_1_title', 'step_1_body', 'step_2_title', 'step_2_body', 'step_3_title', 'step_3_body',
    'feedback_prompt', 'feedback_yes', 'feedback_no', 'handoff_consent', 'handoff_summary_label', 'handoff_summary_placeholder', 'handoff_continue', 'handoff_draft',
    'map_eyebrow', 'map_title', 'map_choice_label', 'map_close_label', 'map_amap_label', 'map_amap_description', 'map_baidu_label', 'map_baidu_description', 'map_system_label', 'map_system_description',
    'map_dialog_kicker', 'map_dialog_title', 'map_dialog_close', 'map_dialog_destination', 'map_button_aria', 'map_button_title',
    'exit_eyebrow', 'exit_title', 'exit_body', 'exit_cancel', 'exit_continue', 'exit_confirm', 'human_support_label', 'online_title', 'online_intro', 'assistant_copy_json', 'back_label',
    'faq_title', 'faq_intro', 'faq_1_question', 'faq_1_answer', 'faq_1_cta', 'faq_2_question', 'faq_2_answer', 'faq_2_cta',
    'faq_3_question', 'faq_3_answer', 'faq_3_cta', 'faq_4_question', 'faq_4_answer', 'faq_4_cta',
    'contact_title', 'contact_intro', 'contact_sales_eyebrow', 'contact_sales_title', 'contact_sales_body', 'contact_sales_cta',
    'contact_visit_eyebrow', 'contact_visit_title', 'contact_visit_body', 'contact_visit_cta'
  ]) if (typeof value[field] === 'string') copy[field] = value[field].trim().slice(0, field === 'body' ? 20_000 : 20_000);
  if (value.categories && typeof value.categories === 'object' && !Array.isArray(value.categories)) {
    const categories = {};
    for (const key of ['product', 'machine', 'software']) {
      if (typeof value.categories[key] === 'string') categories[key] = value.categories[key].trim().slice(0, 120);
    }
    if (Object.keys(categories).length) copy.categories = categories;
  }
  const href = publicHref(value.href);
  const image = publicMediaPath(value.image);
  const icon = publicMediaPath(value.icon);
  if (href) copy.href = href;
  if (image) copy.image = image;
  if (icon) copy.icon = icon;
  if (Array.isArray(value.items)) copy.items = publicItems(value.items, 0, mediaAssets);
  if (Array.isArray(value.marquee_items)) copy.marquee_items = publicItems(value.marquee_items, 0, mediaAssets);
  if (Array.isArray(value.links)) copy.links = publicItems(value.links, 0, mediaAssets);
  if (Array.isArray(value.media)) copy.media = publicMediaEntries(value.media, mediaAssets);
  return Object.keys(copy).length ? copy : null;
}

function publicSection(section, mediaAssets) {
  const copy = {};
  for (const field of ['id', 'kicker', 'title', 'body', 'description', 'detail', 'processTitle', 'outputText', 'image', 'video', 'label', 'href', 'shortTitle', 'introTitle', 'introDetail', 'mode', 'introImage']) {
    if (typeof section?.[field] !== 'string') continue;
    if (['image', 'video', 'introImage'].includes(field)) {
      const path = publicMediaPath(section[field]);
      if (path) copy[field] = path;
    } else copy[field] = section[field];
  }
  // Numeric proof values and their display units are first-class editable
  // content. Keep the scalar shape stable so existing page templates can
  // continue to render legacy string values without exposing arbitrary JSON.
  if (typeof section?.value === 'string' || (typeof section?.value === 'number' && Number.isFinite(section.value))) copy.value = section.value;
  if (typeof section?.unit === 'string') copy.unit = section.unit.trim().slice(0, 40);

  // Keep structured homepage content editable while limiting public output to
  // the small, presentation-oriented shape consumed by Nuxt.
  for (const field of ['items', 'links', 'marquee_items']) if (Array.isArray(section?.[field])) copy[field] = publicItems(section[field], 0, mediaAssets);

  const media = Array.isArray(section?.media)
    ? section.media.flatMap((entry) => {
      const asset = mediaAssets.get(String(entry?.media_asset_id));
      return asset ? [{ ...asset, ...(typeof entry?.role === 'string' && entry.role.trim() ? { role: entry.role.trim().slice(0, 60) } : {}) }] : [];
    })
    : [];
  const content = publicContent(section?.content, mediaAssets);
  const pagination = publicPagination(section?.pagination);
  const presentation = hasSectionPresentation(section) ? normalizeSectionPresentation(section) : null;
  const fieldPresentation = normalizeFieldPresentations(section?.field_presentation, Object.keys(section || {}));
  const safeRepairItems = (value) => Array.isArray(value) ? value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const label = typeof item.label === 'string' ? item.label.trim().slice(0, 120) : '';
    const title = typeof item.title === 'string' ? item.title.trim().slice(0, 120) : '';
    const query = typeof item.query === 'string' ? item.query.trim().slice(0, 240) : '';
    const image = typeof item.image === 'string' && (/^\//.test(item.image) || /^https:\/\//i.test(item.image)) ? item.image : '';
    const number = typeof item.number === 'string' ? item.number.trim().slice(0, 8) : '';
    if (!label && !title) return [];
    return [{ ...(label ? { label } : {}), ...(title ? { title } : {}), ...(query ? { query } : {}), ...(image ? { image } : {}), ...(number ? { number } : {}) }];
  }) : [];
  const repairModels = safeRepairItems(section.repair_models);
  const repairActions = safeRepairItems(section.repair_actions);
  const contentFields = content || {};
  for (const field of ['shortTitle', 'introTitle', 'introDetail', 'mode', 'introImage', 'image', 'icon', 'video']) {
    if (!Object.hasOwn(copy, field) && typeof contentFields[field] === 'string') copy[field] = contentFields[field].trim().slice(0, field === 'introDetail' ? 20_000 : 1000);
  }
  const mediaByRole = (roles, predicate = () => true) => media.find((entry) => roles.includes(String(entry.role || '').toLowerCase()) && predicate(entry)) || media.find(predicate);
  if (media.length) {
    if (!copy.image) copy.image = mediaByRole(['image', 'photo', 'background', 'primary'], (entry) => entry.mediaType !== 'video')?.path;
    if (!copy.icon) copy.icon = mediaByRole(['icon', 'thumbnail', 'tab-icon'], (entry) => entry.mediaType !== 'video')?.path;
    if (!copy.video) copy.video = mediaByRole(['video', 'hero-video'], (entry) => entry.mediaType === 'video')?.path;
  }
  return { ...copy, ...(content ? { content } : {}), ...(pagination ? { pagination } : {}), ...(presentation ? presentation : {}), ...(Object.keys(fieldPresentation).length ? { field_presentation: fieldPresentation } : {}), ...(media.length ? { media } : {}), ...(repairModels.length ? { repairModels } : {}), ...(repairActions.length ? { repairActions } : {}) };
}

async function publicPage(record, mediaAssetResolver) {
  if (!Array.isArray(record?.sections)) return record;
  const sections = record.sections.filter((section) => section && typeof section === 'object' && section.requires_claim_review !== true);
  const nestedMediaIds = [];
  sections.forEach((section) => collectNestedMediaAssetIds(section, nestedMediaIds));
  const mediaAssetIds = [...new Set([...sections.flatMap((section) => collectMediaAssetIds(section.media)), ...nestedMediaIds])];
  const mediaAssets = await mediaAssetResolver.resolve(mediaAssetIds);
  return {
    ...record,
    sections: sections.map((section) => publicSection(section, mediaAssets))
  };
}

export function createCmsPageReader({ endpoint, homepageSectionsEndpoint = '', mediaAssetsEndpoint = '', publicAssetBaseUrl = '', accessToken = '', fetchImpl = fetch, now = () => Date.now(), cacheTtlMs = 30_000 }) {
  const cache = new Map();
  const headers = { Accept: 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };
  const mediaAssets = createCmsMediaAssetResolver({ endpoint: mediaAssetsEndpoint, publicAssetBaseUrl, accessToken, fetchImpl, now });

  async function getHomepageSections(timestamp) {
    if (!homepageSectionsEndpoint) return [];
    const url = new URL(homepageSectionsEndpoint);
    url.searchParams.set('filter[page_key][_eq]', 'home');
    url.searchParams.set('filter[status][_eq]', 'published');
    url.searchParams.set('filter[publication_state][_eq]', 'published');
    url.searchParams.set('filter[enabled][_eq]', 'true');
      url.searchParams.set('fields', 'id,page_key,section_key,title,kicker,body,content,media,sort_order,enabled,language,status,publication_state,published_at');
    url.searchParams.set('sort', 'sort_order');
    url.searchParams.set('limit', '100');
    const response = await fetchImpl(url, { headers });
    if (!response.ok) throw new Error(`CMS homepage sections responded ${response.status}`);
    const body = await response.json();
    if (!Array.isArray(body?.data)) throw new Error('CMS homepage sections response is invalid');
    const records = body.data.filter((section) => isPublished(section, timestamp) && section.enabled !== false);
    const nestedMediaIds = [];
    records.forEach((section) => collectNestedMediaAssetIds(section, nestedMediaIds));
    const mediaAssetIds = [...new Set([...records.flatMap((section) => collectMediaAssetIds(section.media)), ...nestedMediaIds])];
    const resolvedMediaAssets = await mediaAssets.resolve(mediaAssetIds);
    return records.map((section) => ({
      ...publicSection({ ...section, id: section.section_key }, resolvedMediaAssets),
      cms_collection: 'homepage_sections',
      cms_item_id: String(section.id)
    }));
  }

  async function get(slug) {
    const normalizedSlug = String(slug || '').trim();
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(normalizedSlug)) throw new TypeError('page slug is invalid');
    if (!endpoint) return { data: null, cache: 'unavailable', source: 'static' };
    const timestamp = now();
    const cached = cache.get(normalizedSlug);
    if (cached && timestamp - cached.updatedAt < cacheTtlMs) return { data: cached.data, cache: 'fresh', source: 'cms' };
    try {
      const url = new URL(endpoint);
      url.searchParams.set('filter[slug][_eq]', normalizedSlug);
      url.searchParams.set('filter[status][_eq]', 'published');
      url.searchParams.set('filter[publication_state][_eq]', 'published');
      url.searchParams.set('fields', 'id,slug,title,language,sections,seo,status,publication_state,published_at');
      url.searchParams.set('limit', '1');
      const response = await fetchImpl(url, { headers });
      if (!response.ok) throw new Error(`CMS responded ${response.status}`);
      const body = await response.json();
      if (!Array.isArray(body?.data)) throw new Error('CMS page response is invalid');
      const record = body.data.find((candidate) => candidate.slug === normalizedSlug && isPublished(candidate, timestamp)) ?? null;
      let data = record ? await publicPage(record, mediaAssets) : null;
      if (data && normalizedSlug === 'home') {
        try {
          const sections = await getHomepageSections(timestamp);
          if (sections.length) data = { ...data, sections };
        } catch {
          // Keep the legacy pages.sections payload available during migration.
        }
      }
      cache.set(normalizedSlug, { data, updatedAt: timestamp });
      return { data, cache: 'fresh', source: 'cms' };
    } catch {
      if (cached) return { data: cached.data, cache: 'stale', source: 'cms' };
      return { data: null, cache: 'unavailable', source: 'static' };
    }
  }

  return { get };
}
