import { publicMediaAssetPath } from '#shared/public-media-path.mjs';

function isPublished(record, now) {
  if (record?.status !== 'published' || record?.publication_state !== 'published') return false;
  if (!record.published_at) return true;
  const publishedAt = Date.parse(record.published_at);
  return Number.isFinite(publishedAt) && publishedAt <= now;
}

function assetId(value) {
  if (Number.isSafeInteger(value) && value > 0) return String(value);
  const text = typeof value === 'string' ? value.trim() : '';
  return /^(?:[1-9]\d*|[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})$/i.test(text) ? text : '';
}

// Managed CMS assets are streamed by the site itself. See
// shared/public-media-path.mjs for why Directus cannot serve them, and why the
// path is relative (a LAN client keeps working with no extra configured host).

function publicAsset(record, posterFileId = '') {
  const id = assetId(record?.id);
  const path = publicMediaAssetPath(record?.file_id);
  if (!id || !path) return null;
  const posterPath = publicMediaAssetPath(posterFileId) || null;
  const alt = typeof record.alt_text === 'string' ? record.alt_text.trim() : '';
  return [id, {
    path,
    managed: true,
    ...(alt ? { alt } : {}),
    mediaType: record.media_type || (String(record.mime_type || '').startsWith('video/') ? 'video' : 'image'),
    posterPath,
    title: record.title || '', description: record.description || '',
    durationSeconds: record.duration_seconds == null ? null : Number(record.duration_seconds),
    width: record.width == null ? null : Number(record.width), height: record.height == null ? null : Number(record.height),
    autoplay: Boolean(record.autoplay), muted: record.muted !== false, loop: Boolean(record.loop),
    published_at: record.published_at || null
  }];
}

export function collectMediaAssetIds(entries) {
  if (!Array.isArray(entries)) return [];
  return [...new Set(entries.flatMap((entry) => assetId(entry?.media_asset_id) ? [assetId(entry.media_asset_id)] : []))];
}

export function createCmsMediaAssetResolver({ endpoint = '', accessToken = '', fetchImpl = fetch, now = () => Date.now() } = {}) {
  const headers = { Accept: 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };

  return {
    async resolve(ids) {
      const requestedIds = [...new Set((Array.isArray(ids) ? ids : []).map(assetId).filter(Boolean))];
      if (!endpoint || !requestedIds.length) return new Map();
      try {
        const url = new URL(endpoint);
        url.searchParams.set('filter[id][_in]', requestedIds.join(','));
        url.searchParams.set('filter[status][_eq]', 'published');
        url.searchParams.set('filter[publication_state][_eq]', 'published');
        url.searchParams.set('fields', 'id,file_id,alt_text,media_type,mime_type,poster_asset_id,title,description,duration_seconds,width,height,autoplay,muted,loop,status,publication_state,published_at');
        const response = await fetchImpl(url, { headers });
        if (!response.ok) throw new Error(`CMS responded ${response.status}`);
        const body = await response.json();
        if (!Array.isArray(body?.data)) throw new Error('CMS media asset response is invalid');
        return new Map(body.data
          .filter((record) => isPublished(record, now()))
          .map((record) => publicAsset(record))
          .filter(Boolean));
      } catch {
        return new Map();
      }
    }
  };
}

export function createCmsMediaPlacementReader({ endpoint = '', accessToken = '', fetchImpl = fetch, now = () => Date.now(), cacheTtlMs = 30_000 } = {}) {
  let cache;
  const headers = { Accept: 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };
  return { async get(placementKey) {
    const key = String(placementKey || '').trim(); if (!key || !endpoint) return { data: [], source: 'static', cache: 'unavailable' };
    const timestamp = now(); if (cache && cache.key === key && timestamp - cache.updatedAt < cacheTtlMs) return { data: cache.data, source: 'cms', cache: 'fresh' };
    try {
      const mediaUrl = new URL(endpoint); mediaUrl.searchParams.set('filter[placement_key][_eq]', key); mediaUrl.searchParams.set('filter[status][_eq]', 'published'); mediaUrl.searchParams.set('filter[publication_state][_eq]', 'published'); mediaUrl.searchParams.set('filter[enabled][_eq]', 'true'); mediaUrl.searchParams.set('fields', 'id,file_id,alt_text,media_type,mime_type,poster_asset_id,title,description,duration_seconds,width,height,autoplay,muted,loop,status,publication_state,published_at,sort_order'); mediaUrl.searchParams.set('sort', 'sort_order'); mediaUrl.searchParams.set('limit', '100');
      const mediaResponse = await fetchImpl(mediaUrl, { headers }); const mediaBody = mediaResponse.ok ? await mediaResponse.json() : null; const records = (Array.isArray(mediaBody?.data) ? mediaBody.data : []).filter((item) => isPublished(item, timestamp));
      const posterIds = [...new Set(records.map((item) => assetId(item.poster_asset_id)).filter(Boolean))]; const posterFiles = new Map();
      if (posterIds.length) { const posterUrl = new URL(endpoint); posterUrl.searchParams.set('filter[id][_in]', posterIds.join(',')); posterUrl.searchParams.set('filter[status][_eq]', 'published'); posterUrl.searchParams.set('filter[publication_state][_eq]', 'published'); posterUrl.searchParams.set('fields', 'id,file_id,status,publication_state,published_at'); const posterResponse = await fetchImpl(posterUrl, { headers }); const posterBody = posterResponse.ok ? await posterResponse.json() : null; for (const poster of Array.isArray(posterBody?.data) ? posterBody.data : []) if (isPublished(poster, timestamp)) posterFiles.set(String(poster.id), String(poster.file_id || '')); }
      const data = records.map((item) => publicAsset(item, posterFiles.get(String(item.poster_asset_id)) || '')).filter(Boolean).map(([, value]) => value);
      cache = { key, data, updatedAt: timestamp }; return { data, source: 'cms', cache: 'fresh' };
    } catch { return cache?.key === key ? { data: cache.data, source: 'cms', cache: 'stale' } : { data: [], source: 'static', cache: 'unavailable' }; }
  } };
}
