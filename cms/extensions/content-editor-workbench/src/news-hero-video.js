export function newsHeroVideoOptions(assets = []) {
  return (Array.isArray(assets) ? assets : []).filter((asset) => (
    String(asset?.usage_scope || '').trim() === 'article'
    && String(asset?.media_type || '').trim() === 'video'
    && String(asset?.placement_key || '').trim() === 'news.hero.video'
  ));
}

export function newsHeroVideoAssetId(section) {
  const media = Array.isArray(section?.media) ? section.media : [];
  return String(media.find((reference) => String(reference?.role || '').trim() === 'video')?.media_asset_id || '');
}

export function setNewsHeroVideoAsset(section, assetId, assets = []) {
  if (!section || String(section.id || '').trim() !== 'hero') return false;
  const normalizedId = String(assetId || '').trim();
  const media = Array.isArray(section.media) ? section.media : [];
  const preserved = media.filter((reference) => String(reference?.role || '').trim() !== 'video');

  if (!normalizedId) {
    section.media = preserved;
    return true;
  }
  if (!newsHeroVideoOptions(assets).some((asset) => String(asset.id) === normalizedId)) return false;

  section.media = [...preserved, { media_asset_id: normalizedId, role: 'video' }];
  return true;
}
