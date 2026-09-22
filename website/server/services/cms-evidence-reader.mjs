function isPublished(record, now) {
  if (record?.status !== 'published' || record?.publication_state !== 'published') return false;
  if (!record.published_at) return true;
  const publishedAt = Date.parse(record.published_at);
  return Number.isFinite(publishedAt) && publishedAt <= now;
}

function safePath(value) {
  if (typeof value !== 'string') return false;
  const path = value.trim();
  if (path.startsWith('/') && !path.startsWith('//')) return true;
  try {
    return new URL(path).protocol === 'https:';
  } catch {
    return false;
  }
}

function safeMedia(entries, assets, retainIndex = false) {
  if (!Array.isArray(entries)) return [];
  return entries
    .flatMap((entry, sourceIndex) => {
      const path = entry && (safePath(entry.path) ? entry.path.trim() : assets.get(String(entry.media_asset_id))?.path);
      if (!path) return [];
      const asset = assets.get(String(entry.media_asset_id));
      const alt = typeof entry.alt === 'string' && entry.alt.trim() ? entry.alt.trim() : asset?.alt;
      return [{
        path,
        ...(retainIndex ? { sourceIndex } : {}),
        ...(entry?.media_asset_id != null || asset ? { managed: true } : {}),
        ...(alt ? { alt } : {}),
        ...(asset?.mediaType ? { mediaType: asset.mediaType } : {}),
        ...(asset?.posterPath ? { posterPath: asset.posterPath } : {}),
        ...(asset?.title ? { title: asset.title } : {})
      }];
    });
}

function text(value) {
  return typeof value === 'string' ? value : '';
}

function recordId(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value).trim();
}

function sortByOrder(records) {
  return records.toSorted((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0));
}

function normalizeMilestone(record, mediaAssets) {
  if (!Number.isInteger(record?.year) || !text(record.event)) return null;
  const id = recordId(record.id);
  const media = safeMedia(record.media, mediaAssets);
  const iconReference = text(record.icon_asset);
  const iconAsset = mediaAssets.get(iconReference)?.path || (safePath(iconReference) ? iconReference : '');
  return {
    ...(id ? { id } : {}), source_key: text(record.source_key), year: record.year, event: record.event, evidence: text(record.evidence), sort_order: Number(record.sort_order || 0),
    ...(media.length ? { media } : {}), ...(iconAsset ? { icon_asset: iconAsset } : {})
  };
}

function normalizeQualification(record, mediaAssets) {
  const assets = safeMedia(record?.assets, mediaAssets, true);
  if (record?.authorization_status !== 'approved' || !text(record.type) || !text(record.name) || !assets.length) return null;
  const id = recordId(record.id);
  return { ...(id ? { id } : {}), source_key: text(record.source_key), type: record.type, name: record.name, assets, sort_order: Number(record.sort_order || 0) };
}

function normalizeManufacturingEvidence(record, mediaAssets) {
  const media = safeMedia(record?.media, mediaAssets);
  if (!text(record?.process) || !text(record.description) || !media.length) return null;
  const id = recordId(record.id);
  return {
    ...(id ? { id } : {}),
    source_key: text(record.source_key), process: record.process, description: record.description, media,
    inspection_evidence: text(record.inspection_evidence), sort_order: Number(record.sort_order || 0)
  };
}

export function createCmsEvidenceReader({ milestonesEndpoint = '', qualificationsEndpoint = '', manufacturingEvidenceEndpoint = '', mediaAssetsEndpoint = '', publicAssetBaseUrl = '', accessToken = '', fetchImpl = fetch, now = () => Date.now(), cacheTtlMs = 30_000 } = {}) {
  const cache = new Map();
  const headers = { Accept: 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };
  const mediaAssets = createCmsMediaAssetResolver({ endpoint: mediaAssetsEndpoint, publicAssetBaseUrl, accessToken, fetchImpl, now });

  async function list({ cacheKey, endpoint, fields, normalize }) {
    if (!endpoint) return { data: [], cache: 'unavailable', source: 'static' };
    const timestamp = now();
    const cached = cache.get(cacheKey);
    if (cached && timestamp - cached.updatedAt < cacheTtlMs) return { data: cached.data, cache: 'fresh', source: 'cms' };
    try {
      const url = new URL(endpoint);
      url.searchParams.set('filter[status][_eq]', 'published');
      url.searchParams.set('filter[publication_state][_eq]', 'published');
      url.searchParams.set('fields', fields);
      const response = await fetchImpl(url, { headers });
      if (!response.ok) throw new Error(`CMS responded ${response.status}`);
      const body = await response.json();
      if (!Array.isArray(body?.data)) throw new Error('CMS evidence response is invalid');
      const records = body.data.filter((record) => isPublished(record, timestamp));
      const assets = await mediaAssets.resolve(records.flatMap((record) => [
        ...collectMediaAssetIds(record.assets || record.media),
        ...(cacheKey === 'milestones' && text(record.icon_asset) ? [text(record.icon_asset)] : [])
      ]));
      const data = sortByOrder(records
        .map((record) => normalize(record, assets))
        .filter(Boolean));
      cache.set(cacheKey, { data, updatedAt: timestamp });
      return { data, cache: 'fresh', source: 'cms' };
    } catch {
      if (cached) return { data: cached.data, cache: 'stale', source: 'cms' };
      return { data: [], cache: 'unavailable', source: 'static' };
    }
  }

  return {
    listMilestones: () => list({ cacheKey: 'milestones', endpoint: milestonesEndpoint, fields: 'id,source_key,year,event,evidence,media,icon_asset,sort_order,status,publication_state,published_at', normalize: normalizeMilestone }),
    listQualifications: () => list({ cacheKey: 'qualifications', endpoint: qualificationsEndpoint, fields: 'id,source_key,type,name,assets,authorization_status,sort_order,status,publication_state,published_at', normalize: normalizeQualification }),
    listManufacturingEvidence: () => list({ cacheKey: 'manufacturingEvidence', endpoint: manufacturingEvidenceEndpoint, fields: 'id,source_key,process,description,media,inspection_evidence,sort_order,status,publication_state,published_at', normalize: normalizeManufacturingEvidence })
  };
}
import { collectMediaAssetIds, createCmsMediaAssetResolver } from './cms-media-asset-resolver.mjs';
