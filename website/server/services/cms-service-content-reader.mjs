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

export function createCmsServiceContentReader({ resourcesEndpoint, locationsEndpoint, accessToken = '', fetchImpl = fetch, now = () => Date.now(), cacheTtlMs = 30_000 }) {
  const cache = new Map();
  const headers = { Accept: 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };

  async function list({ cacheKey, endpoint, fields, filters = {}, predicate = () => true }) {
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
      const data = body.data.filter((record) => isPublished(record, timestamp) && predicate(record));
      cache.set(cacheKey, { data, updatedAt: timestamp });
      return { data, cache: 'fresh', source: 'cms' };
    } catch {
      if (cached) return { data: cached.data, cache: 'stale', source: 'cms' };
      return { data: [], cache: 'unavailable', source: 'static' };
    }
  }

  return {
    listResources() {
      return list({
        cacheKey: 'resources', endpoint: resourcesEndpoint,
        fields: 'source_key,type,applicable_models,version,language,asset,updated_at,status,publication_state,published_at'
      });
    },
    listLocations() {
      return list({
        cacheKey: 'locations', endpoint: locationsEndpoint,
        fields: 'source_key,region,city,service_scope,contact,business_status,valid_until,status,publication_state,published_at',
        filters: { business_status: 'active' }, predicate: (record) => isEffectiveLocation(record, now())
      });
    }
  };
}
