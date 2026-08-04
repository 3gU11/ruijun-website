function isPublished(record, now) {
  if (record?.status !== 'published' || record?.publication_state !== 'published') return false;
  if (!record.published_at) return true;
  const publishedAt = Date.parse(record.published_at);
  return Number.isFinite(publishedAt) && publishedAt <= now;
}

function validSeriesCode(value) {
  const seriesCode = String(value || '').trim();
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(seriesCode)) throw new TypeError('series code is invalid');
  return seriesCode;
}

function validProductSlug(value) {
  const slug = String(value || '').trim();
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) throw new TypeError('product slug is invalid');
  return slug;
}

function safeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function safePublicUrl(value) {
  const url = safeText(value);
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    return new URL(url).protocol === 'https:' ? url : '';
  } catch {
    return '';
  }
}

function safeResources(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const title = safeText(entry.title) || safeText(entry.name);
    const url = safePublicUrl(entry.url || entry.path || entry.asset);
    if (!title || !url) return [];
    const type = safeText(entry.type);
    return [{ title, ...(type ? { type } : {}), url }];
  });
}

function safeCaseStudies(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const title = safeText(entry.title);
    const url = safePublicUrl(entry.url || entry.path);
    if (!title || !url) return [];
    const summary = safeText(entry.summary);
    return [{ title, ...(summary ? { summary } : {}), url }];
  });
}

function safeMedia(entries, assets) {
  if (!Array.isArray(entries)) return [];
  return entries.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const path = safePublicUrl(entry.path || entry.url || entry.asset) || assets.get(String(entry.media_asset_id))?.path || '';
    if (!path) return [];
    const alt = safeText(entry.alt) || assets.get(String(entry.media_asset_id))?.alt || '';
    return [{ path, ...(alt ? { alt } : {}) }];
  });
}

function sanitizeProductRecord(record, assets = new Map()) {
  if (!record || typeof record !== 'object') return record;
  const product = { ...record };
  if (Object.hasOwn(product, 'resources')) product.resources = safeResources(product.resources);
  if (Object.hasOwn(product, 'case_studies')) product.case_studies = safeCaseStudies(product.case_studies);
  if (Object.hasOwn(product, 'media')) product.media = safeMedia(product.media, assets);
  if (Object.hasOwn(product, 'cover_asset')) product.cover_asset = safePublicUrl(product.cover_asset) || assets.get(String(product.cover_asset))?.path || null;
  return product;
}

export function createCmsProductReader({ seriesEndpoint, modelsEndpoint, mediaAssetsEndpoint = '', publicAssetBaseUrl = '', accessToken = '', fetchImpl = fetch, now = () => Date.now(), cacheTtlMs = 30_000 }) {
  const cache = new Map();
  const headers = { Accept: 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };
  const mediaAssets = createCmsMediaAssetResolver({ endpoint: mediaAssetsEndpoint, publicAssetBaseUrl, accessToken, fetchImpl, now });

  async function list({ cacheKey, endpoint, fields, filters = {}, predicate = () => true, limit, sort }) {
    if (!endpoint) return { data: [], cache: 'unavailable', source: 'static' };
    const timestamp = now();
    const cached = cache.get(cacheKey);
    if (cached && timestamp - cached.updatedAt < cacheTtlMs) return { data: cached.data, cache: 'fresh', source: 'cms' };
    try {
      const url = new URL(endpoint);
      url.searchParams.set('filter[status][_eq]', 'published');
      url.searchParams.set('filter[publication_state][_eq]', 'published');
      if (sort) url.searchParams.set('sort', sort);
      url.searchParams.set('fields', fields);
      if (limit) url.searchParams.set('limit', String(limit));
      for (const [field, value] of Object.entries(filters)) url.searchParams.set(`filter[${field}][_eq]`, value);
      const response = await fetchImpl(url, { headers });
      if (!response.ok) throw new Error(`CMS responded ${response.status}`);
      const body = await response.json();
      if (!Array.isArray(body?.data)) throw new Error('CMS product response is invalid');
      const records = body.data.filter((record) => isPublished(record, timestamp) && predicate(record));
      const assetIds = records.flatMap((record) => [
        ...collectMediaAssetIds(record.media),
        ...collectMediaAssetIds(typeof record.cover_asset === 'string' && !safePublicUrl(record.cover_asset) ? [{ media_asset_id: record.cover_asset }] : [])
      ]);
      const assets = await mediaAssets.resolve(assetIds);
      const data = records.map((record) => sanitizeProductRecord(record, assets));
      cache.set(cacheKey, { data, updatedAt: timestamp });
      return { data, cache: 'fresh', source: 'cms' };
    } catch {
      if (cached) return { data: cached.data, cache: 'stale', source: 'cms' };
      return { data: [], cache: 'unavailable', source: 'static' };
    }
  }

  return {
    listSeries() {
      return list({
        cacheKey: 'series', endpoint: seriesEndpoint,
        fields: 'series_code,slug,name,positioning,scenarios,capabilities,cover_asset,sort_order,language,status,publication_state,published_at',
        sort: 'sort_order'
      });
    },
    async listProducts(seriesCode) {
      const normalizedSeriesCode = seriesCode === undefined ? null : validSeriesCode(seriesCode);
      return list({
        cacheKey: `products:${normalizedSeriesCode || 'all'}`, endpoint: modelsEndpoint,
        fields: 'series_code,model_code,slug,name,parameters,configuration,media,resources,status,publication_state,published_at',
        filters: normalizedSeriesCode ? { series_code: normalizedSeriesCode } : {}, sort: 'model_code',
        predicate: normalizedSeriesCode ? (record) => record.series_code === normalizedSeriesCode : () => true
      });
    },
    async listModels(seriesCode) {
      const normalizedSeriesCode = validSeriesCode(seriesCode);
      return list({
        cacheKey: `models:${normalizedSeriesCode}`, endpoint: modelsEndpoint,
        fields: 'series_code,model_code,slug,name,parameters,configuration,media,resources,status,publication_state,published_at',
        filters: { series_code: normalizedSeriesCode }, sort: 'model_code', predicate: (record) => record.series_code === normalizedSeriesCode
      });
    },
    async getModel(slug) {
      const normalizedSlug = validProductSlug(slug);
      const result = await list({
        cacheKey: `model:${normalizedSlug}`, endpoint: modelsEndpoint,
        fields: 'series_code,model_code,slug,name,parameters,configuration,media,resources,case_studies,status,publication_state,published_at',
        filters: { slug: normalizedSlug }, predicate: (record) => record.slug === normalizedSlug, limit: 1
      });
      return { data: result.data[0] ?? null, cache: result.cache, source: result.source };
    }
  };
}
import { collectMediaAssetIds, createCmsMediaAssetResolver } from './cms-media-asset-resolver.mjs';
