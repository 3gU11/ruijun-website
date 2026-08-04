export class CmsUnavailableError extends Error {
  constructor(cause) {
    super('CMS public content is unavailable', { cause });
    this.name = 'CmsUnavailableError';
  }
}

function isPublished(record, now) {
  if (record?.status !== 'published' || record?.publication_state !== 'published') return false;
  if (!record.published_at) return true;
  const publishedAt = Date.parse(record.published_at);
  return Number.isFinite(publishedAt) && publishedAt <= now;
}

function collectionUrl(endpoint, fields, filters = {}) {
  const url = new URL(endpoint);
  for (const [field, value] of Object.entries({ status: 'published', publication_state: 'published', ...filters })) {
    url.searchParams.set(`filter[${field}][_eq]`, value);
  }
  url.searchParams.set('sort', 'sort_order');
  url.searchParams.set('fields', fields);
  return url;
}

export function createCmsPublicContentClient({ endpoint, productSeriesEndpoint = endpoint, productModelsEndpoint, pagesEndpoint, serviceEntriesEndpoint, fetchImpl = fetch, now = () => Date.now(), cacheTtlMs = 30_000 }) {
  if (!productSeriesEndpoint) throw new TypeError('productSeriesEndpoint is required');
  const caches = new Map();

  async function listPublishedCollection({ cacheKey, collectionEndpoint, fields, filters = {}, limit, recordFilter = () => true }) {
    if (!collectionEndpoint) throw new TypeError(`${cacheKey} endpoint is required`);
    const currentTime = now();
    const cache = caches.get(cacheKey);
    if (cache && currentTime - cache.updatedAt < cacheTtlMs) return { data: cache.data, cache: 'fresh' };

    try {
      const requestUrl = collectionUrl(collectionEndpoint, fields, filters);
      if (limit) requestUrl.searchParams.set('limit', String(limit));
      const response = await fetchImpl(requestUrl, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`CMS responded ${response.status}`);
      const body = await response.json();
      if (!Array.isArray(body?.data)) throw new Error('CMS response data is invalid');
      const data = body.data.filter((record) => isPublished(record, currentTime) && recordFilter(record));
      caches.set(cacheKey, { data, updatedAt: currentTime });
      return { data, cache: 'fresh' };
    } catch (error) {
      if (cache) return { data: cache.data, cache: 'stale' };
      throw new CmsUnavailableError(error);
    }
  }

  return {
    async listProductSeries() {
      return listPublishedCollection({
        cacheKey: 'product-series',
        collectionEndpoint: productSeriesEndpoint,
        fields: 'series_code,slug,name,positioning,scenarios,capabilities,cover_asset,sort_order,language,status,publication_state,published_at'
      });
    },
    async listProductModels(seriesCode) {
      const normalizedSeriesCode = String(seriesCode || '').trim();
      if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(normalizedSeriesCode)) {
        throw new TypeError('series code is invalid');
      }
      return listPublishedCollection({
        cacheKey: `product-models:${normalizedSeriesCode}`,
        collectionEndpoint: productModelsEndpoint,
        fields: 'series_code,model_code,slug,name,parameters,configuration,media,resources,status,publication_state,published_at',
        filters: { series_code: normalizedSeriesCode },
        recordFilter: (record) => record.series_code === normalizedSeriesCode
      });
    },
    async getPage(slug) {
      const normalizedSlug = String(slug || '').trim();
      if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(normalizedSlug)) {
        throw new TypeError('page slug is invalid');
      }
      const result = await listPublishedCollection({
        cacheKey: `page:${normalizedSlug}`,
        collectionEndpoint: pagesEndpoint,
        fields: 'slug,title,language,sections,seo,status,publication_state,published_at',
        filters: { slug: normalizedSlug },
        limit: 1,
        recordFilter: (record) => record.slug === normalizedSlug
      });
      return { data: result.data[0] ?? null, cache: result.cache };
    },
    async listServiceEntries() {
      return listPublishedCollection({
        cacheKey: 'service-entries',
        collectionEndpoint: serviceEntriesEndpoint,
        fields: 'entry_type,url,enabled,open_mode,fallback_phone,health_status,status,publication_state,published_at',
        filters: { enabled: 'true' },
        recordFilter: (record) => record.enabled === true
      });
    }
  };
}
