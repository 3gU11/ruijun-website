import { collectMediaAssetIds, createCmsMediaAssetResolver } from './cms-media-asset-resolver.mjs';
import { normalizeFieldPresentations } from './cms-section-presentation.mjs';

function isPublished(record, now, clockSkewMs = 5_000) {
  if (record?.status !== 'published' || record?.publication_state !== 'published') return false;
  if (!record.published_at) return true;
  const publishedAt = Date.parse(record.published_at);
  return Number.isFinite(publishedAt) && publishedAt <= now + Math.max(0, Number(clockSkewMs) || 0);
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
  const fieldPresentation = normalizeFieldPresentations(article.field_presentation, ['category', 'title', 'display_date', 'summary', 'body', 'transcript']);
  if (Object.keys(fieldPresentation).length) article.field_presentation = fieldPresentation;
  else delete article.field_presentation;
  const hasMedia = Array.isArray(article.media);
  const mediaEntries = hasMedia ? article.media : [];
  const coverReference = { media_asset_id: article.cover_asset };
  const bodyMediaEntries = Array.isArray(article.body_media) ? article.body_media : [];
  const resolvedAssets = await mediaAssets.resolve(collectMediaAssetIds([...mediaEntries, coverReference, ...bodyMediaEntries]));
  const resolvedBodyMedia = bodyMediaEntries.flatMap((item) => { const id = collectMediaAssetIds([item])[0]; const resolved = id ? resolvedAssets.get(id) : null; return resolved?.path ? [{ ...item, path: resolved.path, alt: item?.alt || resolved.alt || resolved.title || '' }] : []; });
  if (resolvedBodyMedia.length) article.body_media = resolvedBodyMedia;
  else delete article.body_media;
  const sanitizedMedia = mediaEntries.flatMap((item) => {
    const referenceId = collectMediaAssetIds([item])[0];
    const resolved = referenceId ? resolvedAssets.get(referenceId) : null;
    if (resolved?.path) return [{
      path: resolved.path,
      alt: String(item?.alt || item?.title || resolved.alt || resolved.title || ''),
      mediaType: resolved.mediaType,
      posterPath: resolved.posterPath,
      title: resolved.title,
      description: resolved.description
    }];
    const path = safePublicUrl(typeof item === 'string' ? item : item?.path || item?.url);
    if (!path) return [];
    return [{ path, alt: typeof item === 'object' ? String(item.alt || item.title || '') : '' }];
  });
  if (hasMedia) article.media = sanitizedMedia;
  if (Object.hasOwn(article, 'video_url')) article.video_url = safePublicUrl(article.video_url);
  if (!Object.hasOwn(article, 'cover_asset')) return article;
  const directCover = safePublicUrl(article.cover_asset);
  if (directCover) {
    article.cover_asset = directCover;
    return article;
  }
  const ids = collectMediaAssetIds([{ media_asset_id: article.cover_asset }]);
  article.cover_asset = ids.length ? resolvedAssets.get(ids[0])?.path || null : null;
  return article;
}

async function sanitizeArticles(records, mediaAssets) {
  return Promise.all((Array.isArray(records) ? records : []).map((record) => sanitizeArticle(record, mediaAssets)));
}

function sameDaySortOrder(record) {
  const value = Number(record?.sort_order);
  return Number.isInteger(value) && value >= 0 ? value : Number.POSITIVE_INFINITY;
}

function compareRecordIdsDescending(left, right) {
  const leftId = Number(left?.id);
  const rightId = Number(right?.id);
  if (Number.isSafeInteger(leftId) && Number.isSafeInteger(rightId)) return rightId - leftId;

  const leftValue = String(left?.id ?? '');
  const rightValue = String(right?.id ?? '');
  if (leftValue === rightValue) return 0;
  return leftValue > rightValue ? -1 : 1;
}

function sortPublishedArticles(records) {
  return [...records].sort((left, right) => {
    const leftTime = Date.parse(left?.display_date || left?.published_at || '');
    const rightTime = Date.parse(right?.display_date || right?.published_at || '');
    const leftValue = Number.isFinite(leftTime) ? leftTime : 0;
    const rightValue = Number.isFinite(rightTime) ? rightTime : 0;
    return rightValue - leftValue
      || sameDaySortOrder(left) - sameDaySortOrder(right)
      || compareRecordIdsDescending(left, right);
  });
}

function normalizeSlug(value) {
  const slug = String(value || '').trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new TypeError('Invalid article slug');
  return slug;
}

export function createCmsArticleReader({ endpoint, mediaAssetsEndpoint = '', publicAssetBaseUrl = '', accessToken = '', fetchImpl = fetch, now = () => Date.now(), cacheTtlMs = 30_000, incompleteRetryAttempts = 2, incompleteRetryDelayMs = 40, publicationClockSkewMs = 5_000 }) {
  let cache;
  let listRequest;
  const detailCache = new Map();
  const headers = { Accept: 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };
  const mediaAssets = createCmsMediaAssetResolver({ endpoint: mediaAssetsEndpoint, publicAssetBaseUrl, accessToken, fetchImpl, now });

  return {
    async list() {
      if (!endpoint) return { data: [], cache: 'unavailable', source: 'static' };
      const timestamp = now();
      if (cache && timestamp - cache.updatedAt < cacheTtlMs) return { data: cache.data, cache: 'fresh', source: 'cms' };
      if (listRequest) return listRequest;
      listRequest = (async () => {
      try {
        const url = new URL(endpoint);
        url.searchParams.set('filter[status][_eq]', 'published');
        url.searchParams.set('filter[publication_state][_eq]', 'published');
        url.searchParams.set('fields', 'id,slug,category,title,display_date,sort_order,summary,body,transcript,field_presentation,media,cover_asset,video_url,seo,status,publication_state,published_at');
        url.searchParams.set('sort', '-display_date,sort_order,-id');
        url.searchParams.set('limit', '100');
        // Directus may enforce a lower server-side maximum than the requested
        // limit. Walk offsets so the public list does not silently truncate
        // news/video items. A restart can briefly return a short page together
        // with a larger filter count; retry that incomplete snapshot before it
        // is allowed into the public cache.
        const requestedPageSize = 100;
        const retryLimit = Math.max(0, Math.min(3, Number(incompleteRetryAttempts) || 0));
        let records = [];
        let total = Number.POSITIVE_INFINITY;
        for (let attempt = 0; attempt <= retryLimit; attempt += 1) {
          records = [];
          let offset = 0;
          total = Number.POSITIVE_INFINITY;
          const seenPageKeys = new Set();
          for (let page = 0; page < 100; page += 1) {
            url.searchParams.set('limit', String(requestedPageSize));
            url.searchParams.set('offset', String(offset));
            url.searchParams.set('meta', 'filter_count');
            const response = await fetchImpl(url, { headers });
            if (!response.ok) throw new Error(`CMS responded ${response.status}`);
            const body = await response.json();
            if (!Array.isArray(body?.data)) throw new Error('CMS article response is invalid');
            const pageKey = body.data.map((record) => String(record?.id ?? record?.slug ?? '')).join('|');
            if (pageKey && seenPageKeys.has(pageKey)) break;
            if (pageKey) seenPageKeys.add(pageKey);
            records.push(...body.data);
            const filterCount = Number(body?.meta?.filter_count);
            if (Number.isFinite(filterCount)) total = filterCount;
            if (body.data.length === 0 || records.length >= total || (!Number.isFinite(filterCount) && body.data.length < requestedPageSize)) break;
            // Some Directus deployments cap `limit` below the requested value.
            // Continue by the number actually returned instead of assuming the page is complete.
            offset += body.data.length;
          }
          const incomplete = Number.isFinite(total) && records.length < total;
          if (!incomplete || attempt >= retryLimit) break;
          const delay = Math.max(0, Number(incompleteRetryDelayMs) || 0);
          if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        }
        // Evaluate the publication gate once the final CMS page has arrived.
        // A record can receive Directus' automatic published_at timestamp while
        // this read is in flight; using the request start time would hide that
        // already-published record until the next public request.
        const publicationTimestamp = now();
        const data = await sanitizeArticles(sortPublishedArticles(records.filter((record) => isPublished(record, publicationTimestamp, publicationClockSkewMs))), mediaAssets);
        cache = { data, updatedAt: timestamp };
        return { data, cache: 'fresh', source: 'cms' };
      } catch {
        return cache ? { data: cache.data, cache: 'stale', source: 'cms' } : { data: [], cache: 'unavailable', source: 'static' };
      }
      })();
      try {
        return await listRequest;
      } finally {
        listRequest = null;
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
        url.searchParams.set('fields', 'id,slug,category,title,display_date,sort_order,summary,body,transcript,field_presentation,media,cover_asset,video_url,seo,status,publication_state,published_at');
        url.searchParams.set('limit', '1');
        const response = await fetchImpl(url, { headers });
        if (!response.ok) throw new Error(`CMS responded ${response.status}`);
        const body = await response.json();
        const record = Array.isArray(body?.data) ? body.data.find((candidate) => candidate?.slug === slug && isPublished(candidate, now(), publicationClockSkewMs)) || null : null;
        const data = record ? await sanitizeArticle(record, mediaAssets) : null;
        detailCache.set(slug, { data, updatedAt: timestamp });
        return { data, cache: 'fresh', source: 'cms' };
      } catch {
        return cached ? { data: cached.data, cache: 'stale', source: 'cms' } : { data: null, cache: 'unavailable', source: 'static' };
      }
    }
  };
}
