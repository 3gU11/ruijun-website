const approvedCopyright = new Set(['owned', 'licensed', 'authorized']);

export function isApprovedVisualMedia(asset, { scope = '', placementKey = '', elementType = '', pageKey = '', sectionKey = '' } = {}) {
  if (!asset?.id || !asset?.file_id) return false;
  if (String(asset.status || '') !== 'published' || String(asset.publication_state || '') !== 'published') return false;
  if (asset.enabled === false || !approvedCopyright.has(String(asset.copyright_status || ''))) return false;
  if (scope && String(asset.usage_scope || '') !== scope) return false;
  if (placementKey && String(asset.placement_key || '') !== placementKey) return false;
  if (pageKey && String(asset.page_key || '').trim() !== pageKey) return false;
  if (sectionKey && String(asset.section_key || '').trim() !== sectionKey) return false;
  if (elementType === 'video' && String(asset.media_type || '') !== 'video') return false;
  if (elementType === 'image' && String(asset.media_type || '') === 'video') return false;
  return true;
}

export function filterVisualMediaAssets(assets, options = {}) {
  return Array.isArray(assets) ? assets.filter((asset) => isApprovedVisualMedia(asset, options)) : [];
}
