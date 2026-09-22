const DIRECT_ASSET_FIELDS = new Set([
  'asset',
  'cover_asset',
  'footer_logo_asset',
  'hero_asset',
  'machine_asset_id',
  'image_asset_id',
  'icon_asset_id',
  'technical_image_asset_id',
  'logo_asset',
  'address_icon_asset',
  'phone_icon_asset',
  'email_icon_asset'
]);

const VIDEO_EXTENSIONS = /\.(?:mp4|webm|mov|m4v)(?:[?#].*)?$/i;
const SAFE_ASSET_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

function cloneValue(value) {
  if (value == null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(cloneValue);
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
  return null;
}

function assetId(value) {
  if (Number.isSafeInteger(value) && value > 0) return String(value);
  const text = typeof value === 'string' ? value.trim() : '';
  return SAFE_ASSET_ID.test(text) ? text : '';
}

function safeMediaPath(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  if (/^\/api\/preview\/media\/(?:[1-9]\d*|[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})$/i.test(raw)) return raw;
  if (/^\/assets\/[A-Za-z0-9._~%/-]+$/.test(raw)) {
    const parts = raw.slice('/assets/'.length).split('/');
    if (!parts.some((part) => !part || part === '.' || part === '..')) return raw;
  }
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.pathname.startsWith('/assets/')) return '';
    const parts = url.pathname.slice('/assets/'.length).split('/');
    if (parts.some((part) => !part || part === '.' || part === '..')) return '';
    return raw;
  } catch {
    return '';
  }
}

function resolveRecord(resolver, id) {
  if (!resolver) return null;
  try {
    if (typeof resolver === 'function') return resolver(id) || null;
    if (typeof resolver.get === 'function') return resolver.get(id) || resolver.get(String(id)) || null;
    if (typeof resolver === 'object') return resolver[id] || resolver[String(id)] || null;
  } catch {
    return null;
  }
  return null;
}

function mediaTypeFor(record, path) {
  const declared = String(record?.mediaType || record?.media_type || '').trim().toLowerCase();
  if (declared === 'video' || declared === 'image' || declared === 'document') return declared;
  return VIDEO_EXTENSIONS.test(path) ? 'video' : 'image';
}

function resolvedMedia(resolver, id) {
  const source = resolveRecord(resolver, id);
  if (source == null || source instanceof Promise) return null;
  const record = typeof source === 'string' ? { path: source } : source;
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
  const path = safeMediaPath(record.path || record.url);
  if (!path) return null;
  const result = {
    path,
    managed: true,
    mediaType: mediaTypeFor(record, path)
  };
  const alt = typeof record.alt === 'string' ? record.alt.trim() : typeof record.alt_text === 'string' ? record.alt_text.trim() : '';
  if (alt) result.alt = alt;
  const posterPath = safeMediaPath(record.posterPath || record.poster_path);
  if (posterPath) result.posterPath = posterPath;
  return result;
}

function materializeReference(value, resolver, { alias = 'none' } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const id = assetId(value.media_asset_id);
  if (!id) return value;
  const media = resolvedMedia(resolver, id);
  if (!media) return value;
  const result = { ...value, media_asset_id: id, ...media };
  const posterId = assetId(value.poster_asset_id);
  if (posterId) {
    result.poster_asset_id = posterId;
    const poster = resolvedMedia(resolver, posterId);
    if (poster?.path) result.posterPath = poster.path;
  }
  if (!result.posterPath && media.posterPath) result.posterPath = media.posterPath;
  if (alias === 'image' || (alias === 'auto' && media.mediaType !== 'video')) result.image = media.path;
  if (alias === 'video' || (alias === 'auto' && media.mediaType === 'video')) result.video = media.path;
  if (alias === 'resource') result.url = media.path;
  return result;
}

function materializeDirectAsset(value, resolver) {
  const id = assetId(value);
  if (!id) return value;
  return resolvedMedia(resolver, id)?.path || value;
}

function materializeValue(value, resolver, context = {}) {
  if (Array.isArray(value)) return value.map((entry) => materializeValue(entry, resolver, { ...context, root: false }));
  if (!value || typeof value !== 'object' || value instanceof Date) return value;

  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    if (DIRECT_ASSET_FIELDS.has(key) && (typeof entry === 'string' || Number.isSafeInteger(entry))) {
      result[key] = materializeDirectAsset(entry, resolver);
      continue;
    }
    if (key === 'media' && Array.isArray(entry)) {
      result[key] = entry.map((item) => materializeValue(item, resolver, { alias: context.root ? 'auto' : 'none', mediaList: true }));
      continue;
    }
    if ((key === 'items' || key === 'features' || key === 'drawings') && Array.isArray(entry)) {
      result[key] = entry.map((item) => materializeValue(item, resolver, { alias: 'image' }));
      continue;
    }
    if (key === 'resources' && Array.isArray(entry)) {
      result[key] = entry.map((item) => materializeValue(item, resolver, { alias: 'resource' }));
      continue;
    }
    result[key] = materializeValue(entry, resolver, { ...context, root: false });
  }

  // The homepage stores the video as an asset ID. Preserve that persisted ID
  // for authorization, while adding a transient path that only exists in the
  // signed draft-preview snapshot.
  if (Object.hasOwn(value, 'hero_video_asset_id')) {
    const id = assetId(value.hero_video_asset_id);
    const media = id ? resolvedMedia(resolver, id) : null;
    if (media?.path) result.hero_video_asset_url = media.path;
  }

  const alias = context.alias || 'none';
  return materializeReference(result, resolver, { alias });
}

/**
 * Resolves governed media IDs for a live preview without changing the draft
 * object that will later be saved back to Directus.
 */
export function materializeVisualMediaRecord(record, resolver) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return cloneValue(record);
  return materializeValue(cloneValue(record), resolver, { root: true });
}
