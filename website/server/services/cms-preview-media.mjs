function mediaAssetId(value) {
  const id = typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : String(value || '').trim();
  return /^(?:[1-9]\d*|[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})$/i.test(id) ? id : '';
}

export function previewMediaPath(value) {
  const id = mediaAssetId(value);
  return id ? `/api/preview/media/${encodeURIComponent(id)}` : '';
}

export function collectPreviewMediaAssetIds(value, result = new Set(), depth = 0) {
  if (depth > 8 || value == null) return result;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectPreviewMediaAssetIds(entry, result, depth + 1));
    return result;
  }
  if (typeof value !== 'object') return result;
  const id = mediaAssetId(value.media_asset_id);
  if (id) result.add(id);
  // The homepage hero uses a dedicated scalar rather than the generic media
  // array. Treat it as an authorized preview asset without changing the ID.
  const heroVideoId = mediaAssetId(value.hero_video_asset_id);
  if (heroVideoId) result.add(heroVideoId);
  // Service resource files use controlled scalar asset fields rather than the
  // generic media array. Once decorated, `asset` is a proxy URL, so retain
  // their opaque identities in dedicated fields for a subsequent live update.
  const serviceAssetId = mediaAssetId(value.asset_media_asset_id) || mediaAssetId(value.asset);
  if (serviceAssetId) result.add(serviceAssetId);
  const serviceCoverAssetId = mediaAssetId(value.cover_media_asset_id) || mediaAssetId(value.cover_asset);
  if (serviceCoverAssetId) result.add(serviceCoverAssetId);
  Object.values(value).forEach((entry) => collectPreviewMediaAssetIds(entry, result, depth + 1));
  return result;
}

// The rendered URL is a same-origin, cookie-protected proxy. Draft file IDs
// therefore never need to become public Directus asset URLs.
export function decoratePreviewMedia(value, depth = 0) {
  if (depth > 8 || value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((entry) => decoratePreviewMedia(entry, depth + 1));
  const copy = Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, decoratePreviewMedia(entry, depth + 1)]));
  const heroVideoId = mediaAssetId(copy.hero_video_asset_id);
  if (heroVideoId) copy.hero_video_asset_url = previewMediaPath(heroVideoId);
  const serviceAssetId = mediaAssetId(copy.asset_media_asset_id) || mediaAssetId(copy.asset);
  if (serviceAssetId) {
    copy.asset_media_asset_id = serviceAssetId;
    copy.asset = previewMediaPath(serviceAssetId);
  }
  const serviceCoverAssetId = mediaAssetId(copy.cover_media_asset_id) || mediaAssetId(copy.cover_asset);
  if (serviceCoverAssetId) {
    copy.cover_media_asset_id = serviceCoverAssetId;
    copy.cover_asset = previewMediaPath(serviceCoverAssetId);
  }
  const productCoverId = mediaAssetId(copy.cover_media_asset_id) || mediaAssetId(copy.cover_asset);
  if (productCoverId && !String(copy.cover_asset || '').startsWith('/api/preview/media/')) {
    copy.cover_media_asset_id = productCoverId;
    copy.cover_asset = previewMediaPath(productCoverId);
  }
  const path = previewMediaPath(copy.media_asset_id);
  return path ? { ...copy, path, managed: true } : copy;
}
