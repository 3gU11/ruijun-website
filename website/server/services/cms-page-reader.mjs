import { collectMediaAssetIds, createCmsMediaAssetResolver } from './cms-media-asset-resolver.mjs';

function isPublished(record, now) {
  if (record?.status !== 'published' || record?.publication_state !== 'published') return false;
  if (!record.published_at) return true;
  const publishedAt = Date.parse(record.published_at);
  return Number.isFinite(publishedAt) && publishedAt <= now;
}

function publicSection(section, mediaAssets) {
  const copy = {};
  for (const field of ['id', 'kicker', 'title', 'body']) {
    if (typeof section?.[field] === 'string') copy[field] = section[field];
  }

  const media = Array.isArray(section?.media)
    ? section.media.flatMap((entry) => {
      const asset = mediaAssets.get(String(entry?.media_asset_id));
      return asset ? [{ ...asset }] : [];
    })
    : [];
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
  return { ...copy, ...(media.length ? { media } : {}), ...(repairModels.length ? { repairModels } : {}), ...(repairActions.length ? { repairActions } : {}) };
}

async function publicPage(record, mediaAssetResolver) {
  if (!Array.isArray(record?.sections)) return record;
  const sections = record.sections.filter((section) => section && typeof section === 'object' && section.requires_claim_review !== true);
  const mediaAssetIds = sections.flatMap((section) => collectMediaAssetIds(section.media));
  const mediaAssets = await mediaAssetResolver.resolve(mediaAssetIds);
  return {
    ...record,
    sections: sections.map((section) => publicSection(section, mediaAssets))
  };
}

export function createCmsPageReader({ endpoint, mediaAssetsEndpoint = '', publicAssetBaseUrl = '', accessToken = '', fetchImpl = fetch, now = () => Date.now(), cacheTtlMs = 30_000 }) {
  const cache = new Map();
  const headers = { Accept: 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };
  const mediaAssets = createCmsMediaAssetResolver({ endpoint: mediaAssetsEndpoint, publicAssetBaseUrl, accessToken, fetchImpl, now });

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
      url.searchParams.set('fields', 'slug,title,language,sections,seo,status,publication_state,published_at');
      url.searchParams.set('limit', '1');
      const response = await fetchImpl(url, { headers });
      if (!response.ok) throw new Error(`CMS responded ${response.status}`);
      const body = await response.json();
      if (!Array.isArray(body?.data)) throw new Error('CMS page response is invalid');
      const record = body.data.find((candidate) => candidate.slug === normalizedSlug && isPublished(candidate, timestamp)) ?? null;
      const data = record ? await publicPage(record, mediaAssets) : null;
      cache.set(normalizedSlug, { data, updatedAt: timestamp });
      return { data, cache: 'fresh', source: 'cms' };
    } catch {
      if (cached) return { data: cached.data, cache: 'stale', source: 'cms' };
      return { data: null, cache: 'unavailable', source: 'static' };
    }
  }

  return { get };
}
