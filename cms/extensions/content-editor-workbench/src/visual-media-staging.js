function matchesMediaType(asset, elementType) {
  const expected = String(elementType || '').trim().toLowerCase();
  if (!expected) return true;
  const actual = String(asset?.media_type || asset?.mime_type || '').trim().toLowerCase();
  if (expected === 'video') return actual === 'video';
  if (expected === 'image') return actual === 'image' || actual.startsWith('image/');
  return true;
}

/**
 * Private draft media may be shown only inside the authenticated CMS preview.
 * It deliberately does not relax the public/published media contract.
 */
export function isPreviewStagingMedia(asset, { scope = '', placementKey = '', elementType = '', pageKey = '', sectionKey = '' } = {}) {
  if (!asset?.id || !asset?.file_id || asset.enabled === false || String(asset.enabled).toLowerCase() === 'false') return false;
  if (String(asset.status || '') !== 'draft' || String(asset.publication_state || '') !== 'unpublished') return false;
  if (scope && String(asset.usage_scope || '') !== scope) return false;
  if (placementKey && String(asset.placement_key || '') !== placementKey) return false;
  if (pageKey && String(asset.page_key || '').trim() !== pageKey) return false;
  if (sectionKey && String(asset.section_key || '').trim() !== sectionKey) return false;
  return matchesMediaType(asset, elementType);
}

export function filterPreviewStagingMediaAssets(assets, options = {}) {
  return Array.isArray(assets) ? assets.filter((asset) => isPreviewStagingMedia(asset, options)) : [];
}
