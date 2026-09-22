import { createCmsMediaAssetResolver } from './cms-media-asset-resolver.mjs';

const settingAssetFields = Object.freeze([
  ['brand', 'logo_asset', 'logo_path'],
  ['brand', 'footer_logo_asset', 'footer_logo_path'],
  ['footer', 'address_icon_asset', 'address_icon_path'],
  ['footer', 'phone_icon_asset', 'phone_icon_path'],
  ['footer', 'email_icon_asset', 'email_icon_path']
]);

function assetId(value) {
  const text = typeof value === 'string' || Number.isSafeInteger(value) ? String(value).trim() : '';
  return /^(?:[1-9]\d*|[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})$/i.test(text) ? text : '';
}

async function resolveSettingMedia(record, resolver) {
  const ids = settingAssetFields.map(([group, field]) => assetId(record?.[group]?.[field])).filter(Boolean);
  if (!ids.length) return record;
  const assets = await resolver.resolve(ids);
  if (!assets.size) return record;
  const result = { ...record, brand: { ...(record.brand || {}) }, footer: { ...(record.footer || {}) } };
  for (const [group, field, pathField] of settingAssetFields) {
    const media = assets.get(assetId(record?.[group]?.[field]));
    if (media?.path) result[group][pathField] = media.path;
  }
  return result;
}

export function createCmsNavigationReader({ endpoint, mediaAssetsEndpoint = '', publicAssetBaseUrl = '', accessToken = '', fetchImpl = fetch, cacheTtlMs = 30_000, now = () => Date.now() }) {
  let cache;
  const headers = { Accept: 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };
  const mediaResolver = createCmsMediaAssetResolver({ endpoint: mediaAssetsEndpoint, publicAssetBaseUrl, accessToken, fetchImpl, now });
  return { async get() { if (!endpoint) return { data: null, cache: 'unavailable', source: 'static' }; const time = now(); if (cache && time - cache.updatedAt < cacheTtlMs) return { data: cache.data, cache: 'fresh', source: 'cms' }; try { const url = new URL(endpoint); url.searchParams.set('filter[status][_eq]', 'published'); url.searchParams.set('filter[publication_state][_eq]', 'published'); url.searchParams.set('filter[setting_key][_eq]', 'global'); url.searchParams.set('fields', 'setting_key,navigation,footer,brand,contacts,status,publication_state,published_at'); url.searchParams.set('limit', '1'); const response = await fetchImpl(url, { headers }); const body = response.ok ? await response.json() : null; const published = Array.isArray(body?.data) ? body.data.find(item => item.setting_key === 'global' && item.status === 'published' && item.publication_state === 'published' && (!item.published_at || Date.parse(item.published_at) <= time)) || null : null; if (!published) throw new Error('CMS navigation unavailable'); const data = await resolveSettingMedia(published, mediaResolver); cache = { data, updatedAt: time }; return { data, cache: 'fresh', source: 'cms' }; } catch { return cache ? { data: cache.data, cache: 'stale', source: 'cms' } : { data: null, cache: 'unavailable', source: 'static' }; } } };
}
