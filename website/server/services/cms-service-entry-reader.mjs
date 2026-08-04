function isPublished(record, now) {
  if (record?.status !== 'published' || record?.publication_state !== 'published') return false;
  if (!record.published_at) return true;
  const publishedAt = Date.parse(record.published_at);
  return Number.isFinite(publishedAt) && publishedAt <= now;
}

export function createCmsServiceEntryReader({ endpoint, accessToken = '', fetchImpl = fetch, now = () => Date.now(), cacheTtlMs = 30_000 }) {
  let cache = null;
  const headers = { Accept: 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };

  async function list() {
    if (!endpoint) return { data: [], cache: 'unavailable', source: 'static' };
    const timestamp = now();
    if (cache && timestamp - cache.updatedAt < cacheTtlMs) return { data: cache.data, cache: 'fresh', source: 'cms' };
    try {
      const url = new URL(endpoint);
      url.searchParams.set('filter[status][_eq]', 'published');
      url.searchParams.set('filter[publication_state][_eq]', 'published');
      url.searchParams.set('filter[enabled][_eq]', 'true');
      url.searchParams.set('fields', 'entry_type,url,enabled,open_mode,fallback_phone,health_status,status,publication_state,published_at');
      const response = await fetchImpl(url, { headers });
      if (!response.ok) throw new Error(`CMS responded ${response.status}`);
      const body = await response.json();
      if (!Array.isArray(body?.data)) throw new Error('CMS service entry response is invalid');
      const data = body.data.filter((record) => record.enabled === true && isPublished(record, timestamp));
      cache = { data, updatedAt: timestamp };
      return { data, cache: 'fresh', source: 'cms' };
    } catch {
      if (cache) return { data: cache.data, cache: 'stale', source: 'cms' };
      return { data: [], cache: 'unavailable', source: 'static' };
    }
  }

  return { list };
}
