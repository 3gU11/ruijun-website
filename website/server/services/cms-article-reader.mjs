function isPublished(record, now) {
  if (record?.status !== 'published' || record?.publication_state !== 'published') return false;
  if (!record.published_at) return true;
  const publishedAt = Date.parse(record.published_at);
  return Number.isFinite(publishedAt) && publishedAt <= now;
}

function publicationTime(record) {
  const time = Date.parse(record?.published_at || '');
  return Number.isFinite(time) ? time : 0;
}

function normalizeSlug(value) {
  const slug = String(value || '').trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new TypeError('Invalid article slug');
  return slug;
}

export function createCmsArticleReader({ endpoint, accessToken = '', fetchImpl = fetch, now = () => Date.now(), cacheTtlMs = 30_000 }) {
  let cache;
  const detailCache = new Map();
  const headers = { Accept: 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };

  return {
    async list() {
      if (!endpoint) return { data: [], cache: 'unavailable', source: 'static' };
      const timestamp = now();
      if (cache && timestamp - cache.updatedAt < cacheTtlMs) return { data: cache.data, cache: 'fresh', source: 'cms' };
      try {
        const url = new URL(endpoint);
        url.searchParams.set('filter[status][_eq]', 'published');
        url.searchParams.set('filter[publication_state][_eq]', 'published');
        url.searchParams.set('fields', 'slug,category,title,summary,cover_asset,video_url,seo,status,publication_state,published_at');
        url.searchParams.set('limit', '100');
        const response = await fetchImpl(url, { headers });
        if (!response.ok) throw new Error(`CMS responded ${response.status}`);
        const body = await response.json();
        if (!Array.isArray(body?.data)) throw new Error('CMS article response is invalid');
        const data = body.data.filter((record) => isPublished(record, timestamp)).sort((left, right) => publicationTime(right) - publicationTime(left));
        cache = { data, updatedAt: timestamp };
        return { data, cache: 'fresh', source: 'cms' };
      } catch {
        return cache ? { data: cache.data, cache: 'stale', source: 'cms' } : { data: [], cache: 'unavailable', source: 'static' };
      }
    },
    async get(value) {
      const slug = normalizeSlug(value);
      if (!endpoint) return { data: null, cache: 'unavailable', source: 'static' };
      const timestamp = now();
      const cached = detailCache.get(slug);
      if (cached && timestamp - cached.updatedAt < cacheTtlMs) return { data: cached.data, cache: 'fresh', source: 'cms' };
      try {
        const url = new URL(endpoint);
        url.searchParams.set('filter[slug][_eq]', slug);
        url.searchParams.set('filter[status][_eq]', 'published');
        url.searchParams.set('filter[publication_state][_eq]', 'published');
        url.searchParams.set('fields', 'slug,category,title,summary,body,cover_asset,video_url,seo,status,publication_state,published_at');
        url.searchParams.set('limit', '1');
        const response = await fetchImpl(url, { headers });
        if (!response.ok) throw new Error(`CMS responded ${response.status}`);
        const body = await response.json();
        const data = Array.isArray(body?.data) ? body.data.find((record) => record?.slug === slug && isPublished(record, timestamp)) || null : null;
        detailCache.set(slug, { data, updatedAt: timestamp });
        return { data, cache: 'fresh', source: 'cms' };
      } catch {
        return cached ? { data: cached.data, cache: 'stale', source: 'cms' } : { data: null, cache: 'unavailable', source: 'static' };
      }
    }
  };
}
