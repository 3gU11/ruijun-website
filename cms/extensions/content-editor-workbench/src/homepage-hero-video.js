export function homeHeroVideoOptions(assets = []) {
  return (Array.isArray(assets) ? assets : []).filter((asset) => (
    String(asset?.media_type || '').trim() === 'video'
    && String(asset?.placement_key || '').trim() === 'home.hero.video'
  ));
}

// The homepage template reads this scalar field, not the generic section
// media list. Keep the selection explicit so a successful form save always
// changes the video source used by the visual preview.
export function setHomeHeroVideoAsset(section, assetId, assets = []) {
  if (!section || String(section.id || '').trim() !== 'hero') return false;
  const normalizedId = String(assetId || '').trim();
  if (!normalizedId) {
    section.hero_video_asset_id = '';
    return true;
  }
  if (!homeHeroVideoOptions(assets).some((asset) => String(asset.id) === normalizedId)) return false;
  section.hero_video_asset_id = normalizedId;
  return true;
}
