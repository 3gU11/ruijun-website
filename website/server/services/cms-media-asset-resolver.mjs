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

function safeAssetBaseUrl(endpoint, configuredBaseUrl) {
  try {
    const base = new URL(configuredBaseUrl || endpoint);
    const local = base.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname);
    if (base.protocol !== 'https:' && !local) return null;
    return base;
  } catch {
    return null;
  }
}

function publicAsset(record, baseUrl) {
  const id = assetId(record?.id);
  const fileId = typeof record?.file_id === 'string' ? record.file_id.trim() : '';
  if (!id || !fileId || !baseUrl) return null;
  const path = new URL(`/assets/${encodeURIComponent(fileId)}`, baseUrl).toString();
  const alt = typeof record.alt_text === 'string' ? record.alt_text.trim() : '';
  return [id, { path, ...(alt ? { alt } : {}) }];
}

export function collectMediaAssetIds(entries) {
  if (!Array.isArray(entries)) return [];
  return [...new Set(entries.flatMap((entry) => assetId(entry?.media_asset_id) ? [assetId(entry.media_asset_id)] : []))];
}

export function createCmsMediaAssetResolver({ endpoint = '', publicAssetBaseUrl = '', accessToken = '', fetchImpl = fetch, now = () => Date.now() } = {}) {
  const headers = { Accept: 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };

  return {
    async resolve(ids) {
      const requestedIds = [...new Set((Array.isArray(ids) ? ids : []).map(assetId).filter(Boolean))];
      const baseUrl = safeAssetBaseUrl(endpoint, publicAssetBaseUrl);
      if (!endpoint || !baseUrl || !requestedIds.length) return new Map();
      try {
        const url = new URL(endpoint);
        url.searchParams.set('filter[id][_in]', requestedIds.join(','));
        url.searchParams.set('filter[status][_eq]', 'published');
        url.searchParams.set('filter[publication_state][_eq]', 'published');
        url.searchParams.set('fields', 'id,file_id,alt_text,status,publication_state,published_at');
        const response = await fetchImpl(url, { headers });
        if (!response.ok) throw new Error(`CMS responded ${response.status}`);
        const body = await response.json();
        if (!Array.isArray(body?.data)) throw new Error('CMS media asset response is invalid');
        return new Map(body.data
          .filter((record) => isPublished(record, now()))
          .map((record) => publicAsset(record, baseUrl))
          .filter(Boolean));
      } catch {
        return new Map();
      }
    }
  };
}
