import { collectMediaAssetIds, createCmsMediaAssetResolver } from './cms-media-asset-resolver.mjs';

function isPublished(record, now) {
  if (record?.status !== 'published' || record?.publication_state !== 'published') return false;
  if (!record.published_at) return true;
  const publishedAt = Date.parse(record.published_at);
  return Number.isFinite(publishedAt) && publishedAt <= now;
}

function safePublicUrl(value) {
  const url = typeof value === 'string' ? value.trim() : '';
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    return new URL(url).protocol === 'https:' ? url : '';
  } catch {
    return '';
  }
}

async function sanitizeArticle(record, mediaAssets) {
  if (!record || typeof record !== 'object') return record;
  const article = { ...record };
  if (!Object.hasOwn(article, 'cover_asset')) return article;
  const directCover = safePublicUrl(article.cover_asset);
  if (directCover) {
    article.cover_asset = directCover;
    return article;
  }
  const ids = collectMediaAssetIds([{ media_asset_id: article.cover_asset }]);
  const assets = await mediaAssets.resolve(ids);
  article.cover_asset = ids.length ? assets.get(ids[0])?.path || null : null;
  return article;
}

async function sanitizeArticles(records, mediaAssets) {
  return Promise.all((Array.isArray(records) ? records : []).map((record) => sanitizeArticle(record, mediaAssets)));
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

export function createCmsArticleReader({ endpoint, mediaAssetsEndpoint = '', publicAssetBaseUrl = '', accessToken = '', fetchImpl = fetch, now = () => Date.now(), cacheTtlMs = 30_000 }) {
  let cache;
  const detailCache = new Map();
  const headers = { Accept: 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };
  const mediaAssets = createCmsMediaAssetResolver({ endpoint: mediaAssetsEndpoint, publicAssetBaseUrl, accessToken, fetchImpl, now });

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
        const data = await sanitizeArticles(body.data.filter((record) => isPublished(record, timestamp)).sort((left, right) => publicationTime(right) - publicationTime(left)), mediaAssets);
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
        const record = Array.isArray(body?.data) ? body.data.find((candidate) => candidate?.slug === slug && isPublished(candidate, timestamp)) || null : null;
        const data = record ? await sanitizeArticle(record, mediaAssets) : null;
        detailCache.set(slug, { data, updatedAt: timestamp });
        return { data, cache: 'fresh', source: 'cms' };
      } catch {
        return cached ? { data: cached.data, cache: 'stale', source: 'cms' } : { data: null, cache: 'unavailable', source: 'static' };
      }
    }
  };
}
