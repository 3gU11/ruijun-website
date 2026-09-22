function isImage(asset) {
  return asset?.media_type === 'image' || String(asset?.mime_type || '').startsWith('image/');
}

function isPublished(asset) {
  return asset?.status === 'published' && asset?.publication_state === 'published';
}

function uniqueById(assets) {
  const known = new Set();
  return assets.filter((asset) => {
    const id = String(asset?.id || '');
    if (!id || known.has(id)) return false;
    known.add(id);
    return true;
  });
}

const dedicatedPosterPlacementByVideo = Object.freeze({
  'home.hero.video': 'home.hero.poster',
  'service.tutorial.video': 'service.tutorial.poster'
});

export function videoPosterAssets({ placementKey, publishedAssets, candidates }) {
  const dedicatedPosterPlacement = dedicatedPosterPlacementByVideo[String(placementKey || '')];
  const publishedImages = (Array.isArray(publishedAssets) ? publishedAssets : []).filter((asset) => (
    isImage(asset)
    && isPublished(asset)
    && (!dedicatedPosterPlacement || asset?.placement_key === dedicatedPosterPlacement)
  ));
  if (!dedicatedPosterPlacement) return publishedImages;

  const privatePosters = (Array.isArray(candidates) ? candidates : []).filter((asset) => (
    isImage(asset)
    && asset?.placement_key === dedicatedPosterPlacement
    && !isPublished(asset)
  ));
  return uniqueById([...publishedImages, ...privatePosters]);
}
