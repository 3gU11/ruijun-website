import { collectMediaAssetIds, createCmsMediaAssetResolver } from './cms-media-asset-resolver.mjs';

function isPublished(record, now) {
  if (record?.status !== 'published' || record?.publication_state !== 'published') return false;
  if (!record.published_at) return true;
  const publishedAt = Date.parse(record.published_at);
  return Number.isFinite(publishedAt) && publishedAt <= now;
}

function isEffectiveLocation(record, now) {
  if (record?.business_status !== 'active') return false;
  if (!record.valid_until) return true;
  const validUntil = String(record.valid_until);
  return /^\d{4}-\d{2}-\d{2}$/.test(validUntil) && validUntil >= new Date(now).toISOString().slice(0, 10);
}

function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function safePath(value) {
  const path = text(value);
  if (path.startsWith('/') && !path.startsWith('//')) return path;
  try { return new URL(path).protocol === 'https:' ? path : ''; } catch { return ''; }
}
function assetPath(value, assets) { return safePath(value) || assets.get(String(value || ''))?.path || ''; }
function safeList(value) { return Array.isArray(value) ? value.map((item) => text(item?.content ?? item)).filter(Boolean) : []; }

function normalizeResource(record, assets) {
  const title = text(record.title);
  const type = text(record.type);
  const asset = assetPath(record.asset, assets);
  if (!title || !type || !asset) return null;
  const coverAsset = assetPath(record.cover_asset, assets);
  return {
    source_key: text(record.source_key), type, title, summary: text(record.summary), body: text(record.body),
    applicable_models: safeList(record.applicable_models), version: text(record.version), language: text(record.language),
    asset, ...(coverAsset ? { cover_asset: coverAsset, cover_alt: assets.get(String(record.cover_asset || ''))?.alt || title } : {}),
    display_date: text(record.display_date), sort_order: Number(record.sort_order || 0), updated_at: text(record.updated_at)
  };
}

function normalizeKnowledge(record, assets) {
  const title = text(record.question_title);
  const category = text(record.category);
  if (!title || !['fault_analysis', 'knowledge_share'].includes(category)) return null;
  const media = Array.isArray(record.media) ? record.media.flatMap((entry) => {
    const path = safePath(entry?.path) || assets.get(String(entry?.media_asset_id || ''))?.path;
    if (!path) return [];
    return [{ path, alt: text(entry?.alt) || assets.get(String(entry?.media_asset_id || ''))?.alt || title }];
  }) : [];
  return {
    source_key: text(record.source_key), category, title, summary: text(record.symptoms),
    applicable_models: safeList(record.applicable_models), error_codes: safeList(record.error_codes),
    steps: safeList(record.troubleshooting_steps), safety_preconditions: safeList(record.safety_preconditions),
    risk_level: text(record.risk_level), version: text(record.version), display_date: text(record.display_date),
    sort_order: Number(record.sort_order || 0), media
  };
}

export function createCmsServiceContentReader({ resourcesEndpoint, locationsEndpoint, knowledgeEndpoint = '', mediaAssetsEndpoint = '', publicAssetBaseUrl = '', accessToken = '', fetchImpl = fetch, now = () => Date.now(), cacheTtlMs = 30_000 }) {
  const cache = new Map();
  const headers = { Accept: 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };
  const mediaAssets = createCmsMediaAssetResolver({ endpoint: mediaAssetsEndpoint, publicAssetBaseUrl, accessToken, fetchImpl, now });

  async function list({ cacheKey, endpoint, fields, filters = {}, predicate = () => true, normalize }) {
    if (!endpoint) return { data: [], cache: 'unavailable', source: 'static' };
    const timestamp = now();
    const cached = cache.get(cacheKey);
    if (cached && timestamp - cached.updatedAt < cacheTtlMs) return { data: cached.data, cache: 'fresh', source: 'cms' };
    try {
      const url = new URL(endpoint);
      url.searchParams.set('filter[status][_eq]', 'published');
      url.searchParams.set('filter[publication_state][_eq]', 'published');
      url.searchParams.set('fields', fields);
      for (const [field, value] of Object.entries(filters)) url.searchParams.set(`filter[${field}][_eq]`, value);
      const response = await fetchImpl(url, { headers });
      if (!response.ok) throw new Error(`CMS responded ${response.status}`);
      const body = await response.json();
      if (!Array.isArray(body?.data)) throw new Error('CMS service content response is invalid');
      const records = body.data.filter((record) => isPublished(record, timestamp) && predicate(record));
      const ids = records.flatMap((record) => [record.asset, record.cover_asset, ...collectMediaAssetIds(record.media)].filter(Boolean));
      const assets = await mediaAssets.resolve(ids);
      const data = (normalize ? records.map((record) => normalize(record, assets)).filter(Boolean) : records)
        .toSorted((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0));
      cache.set(cacheKey, { data, updatedAt: timestamp });
      return { data, cache: 'fresh', source: 'cms' };
    } catch {
      if (cached) return { data: cached.data, cache: 'stale', source: 'cms' };
      return { data: [], cache: 'unavailable', source: 'static' };
    }
  }

  return {
    listResources: () => list({ cacheKey: 'resources', endpoint: resourcesEndpoint,
      fields: 'source_key,type,title,summary,body,applicable_models,version,language,asset,cover_asset,display_date,sort_order,updated_at,status,publication_state,published_at', normalize: normalizeResource }),
    listKnowledge: () => list({ cacheKey: 'knowledge', endpoint: knowledgeEndpoint,
      fields: 'source_key,visibility,channel,category,question_title,applicable_models,error_codes,symptoms,troubleshooting_steps,risk_level,safety_preconditions,media,version,display_date,sort_order,status,publication_state,published_at',
      filters: { visibility: 'public' }, predicate: (record) => record.visibility === 'public' && ['website', 'both'].includes(record.channel), normalize: normalizeKnowledge }),
    listLocations: () => list({ cacheKey: 'locations', endpoint: locationsEndpoint,
      fields: 'source_key,region,city,service_scope,contact,business_status,valid_until,status,publication_state,published_at',
      filters: { business_status: 'active' }, predicate: (record) => isEffectiveLocation(record, now()) })
  };
}
