export function editorialPreviewGrantIds(preview) {
 const ids = preview?.category === 'news' ? [preview.cover_media_asset_id, ...(Array.isArray(preview.body_media) ? preview.body_media.map(item => item?.media_asset_id) : [])]
   : preview?.category === 'video' ? (Array.isArray(preview.media) ? preview.media : []).map(item=>item?.media_asset_id) : [];
 return [...new Set(ids.filter(Boolean).map(String))];
}

export function livePreviewGrantIds(collection, preview) {
 if (collection === 'qualifications') return [...new Set((Array.isArray(preview?.assets) ? preview.assets : []).map(item => item?.media_asset_id).filter(value => /^[1-9]\d*$/.test(String(value || ''))).map(String))];
 if (collection === 'articles') return editorialPreviewGrantIds(preview);
 if (collection === 'service_resources') return [...new Set([preview?.asset_media_asset_id, preview?.cover_media_asset_id].filter(Boolean).map(String))];
 if (collection === 'product_series') {
  const coverAssetId = String(preview?.cover_media_asset_id || preview?.cover_asset || '').trim();
  return /^[1-9]\d*$/.test(coverAssetId) ? [coverAssetId] : [];
 }
 if (collection === 'product_models') {
  const configuration = preview?.configuration && typeof preview.configuration === 'object' ? preview.configuration : {};
  const entries = [
   ...(Array.isArray(preview?.resources) ? preview.resources : []),
   ...(Array.isArray(configuration.features) ? configuration.features : []),
   ...(Array.isArray(configuration.drawings) ? configuration.drawings : []),
   configuration,
   configuration.labels
  ];
  return [...new Set(entries.flatMap(item => [item?.media_asset_id, item?.image, item?.machine_asset_id, item?.technical_image_asset_id]).filter(value => /^[1-9]\d*$/.test(String(value || ''))).map(String))];
 }
 if (collection !== 'pages' || !['home','product','manufacturing','news','about','service'].includes(preview?.slug)) return [];
 const sections = Array.isArray(preview.sections) ? preview.sections : [];
 const videoId = preview.slug === 'home' ? sections.find(section => section?.id === 'hero')?.hero_video_asset_id : null;
 const mediaIds = sections.flatMap(section => Array.isArray(section?.media) ? section.media.map(item => item?.media_asset_id) : []);
 return [...new Set([videoId,...mediaIds].filter(Boolean).map(String))];
}
