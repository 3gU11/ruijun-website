// The same-origin path the site streams a published CMS media asset binary from.
//
// Directus cannot serve these bytes itself: the public policy has no
// `directus_files` read permission (only the editor policy has one, scoped to
// their own uploads), so a Directus-origin asset URL answers 403 with a JSON
// body and the browser refuses the cross-origin media load (ERR_BLOCKED_BY_ORB).
// The route at /api/public/v1/media/asset/<fileId> re-checks the published state
// and proxies the file with the site's service token instead.
//
// Kept in one module because the reader builds these paths, and the live-preview
// media guard has to accept the same shape when an editor swaps an asset.
export const PUBLIC_MEDIA_ASSET_PATH_PREFIX = '/api/public/v1/media/asset/';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function publicMediaAssetPath(fileId) {
  const id = typeof fileId === 'string' ? fileId.trim() : '';
  return UUID_PATTERN.test(id) ? `${PUBLIC_MEDIA_ASSET_PATH_PREFIX}${id}` : '';
}

export function isPublicMediaAssetPath(value) {
  return String(value || '').startsWith(PUBLIC_MEDIA_ASSET_PATH_PREFIX);
}
