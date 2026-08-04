const mib = 1024 * 1024;

const uploadRules = Object.freeze({
  'image/jpeg': { extensions: ['jpg', 'jpeg'], maxBytes: 25 * mib },
  'image/png': { extensions: ['png'], maxBytes: 25 * mib },
  'image/webp': { extensions: ['webp'], maxBytes: 25 * mib },
  'image/avif': { extensions: ['avif'], maxBytes: 25 * mib },
  'video/mp4': { extensions: ['mp4'], maxBytes: 500 * mib },
  'video/webm': { extensions: ['webm'], maxBytes: 500 * mib },
  'application/pdf': { extensions: ['pdf'], maxBytes: 50 * mib }
});

const reviewRolesByUsageScope = Object.freeze({
  product: 'technical_reviewer',
  manufacturing: 'technical_reviewer',
  service: 'technical_reviewer',
  knowledge: 'technical_reviewer',
  brand: 'brand_reviewer',
  article: 'brand_reviewer',
  qualification: 'brand_reviewer',
  case_study: 'brand_reviewer'
});

const directAssetFields = Object.freeze(['cover_asset', 'asset']);
const listAssetFields = Object.freeze(['media', 'assets']);
const protectedStatuses = new Set(['review', 'scheduled', 'published']);
const copyrightStatuses = new Set(['owned', 'licensed', 'authorized', 'pending_review']);

export class MediaAssetGovernanceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'MediaAssetGovernanceError';
    this.code = code;
  }
}

function requiredText(value, fieldName) {
  const text = typeof value === 'string' ? value.normalize('NFKC').trim() : '';
  if (!text) throw new MediaAssetGovernanceError('MEDIA_METADATA_INVALID', `${fieldName} is required`);
  return text;
}

function assetIdText(value) {
  if (typeof value === 'string') return value.normalize('NFKC').trim();
  if (Number.isSafeInteger(value) && value > 0) return String(value);
  return '';
}

function extensionOf(fileName) {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts.at(-1) : '';
}

function asList(value, fieldName) {
  if (value == null) return [];
  if (typeof value === 'string') {
    try {
      return asList(JSON.parse(value), fieldName);
    } catch {
      throw new MediaAssetGovernanceError('MEDIA_REFERENCE_INVALID', `${fieldName} must be a JSON array`);
    }
  }
  if (!Array.isArray(value)) throw new MediaAssetGovernanceError('MEDIA_REFERENCE_INVALID', `${fieldName} must be an array`);
  return value;
}

export function assertMediaAssetUpload(payload) {
  const fileName = requiredText(payload?.filename_download, 'filename_download');
  const mimeType = requiredText(payload?.type, 'type').toLowerCase();
  const byteSize = Number(payload?.filesize);
  const rule = uploadRules[mimeType];
  if (!rule) throw new MediaAssetGovernanceError('MEDIA_TYPE_INVALID', 'This media MIME type is not permitted for public content');
  if (!rule.extensions.includes(extensionOf(fileName))) throw new MediaAssetGovernanceError('MEDIA_EXTENSION_INVALID', 'The file extension does not match its declared MIME type');
  if (!Number.isInteger(byteSize) || byteSize < 1) throw new MediaAssetGovernanceError('MEDIA_METADATA_INVALID', 'filesize must be a positive integer');
  if (byteSize > rule.maxBytes) throw new MediaAssetGovernanceError('MEDIA_FILE_TOO_LARGE', 'The public media file exceeds its size limit');
  return payload;
}

export function reviewerRoleForMediaUsageScope(usageScope) {
  const normalized = typeof usageScope === 'string' ? usageScope.normalize('NFKC').trim().toLowerCase() : '';
  const role = reviewRolesByUsageScope[normalized];
  if (!role) throw new MediaAssetGovernanceError('MEDIA_USAGE_SCOPE_INVALID', 'A supported media usage scope is required');
  return role;
}

export function assertMediaAssetRecord(input, file) {
  const fileId = requiredText(input?.file_id, 'file_id');
  if (!file || String(file.id || '') !== fileId) {
    throw new MediaAssetGovernanceError('MEDIA_FILE_NOT_FOUND', 'The uploaded media file is unavailable');
  }
  assertMediaAssetUpload(file);
  const originalFileName = requiredText(input?.original_file_name, 'original_file_name');
  const mimeType = requiredText(input?.mime_type, 'mime_type').toLowerCase();
  const byteSize = Number(input?.byte_size);
  if (originalFileName !== file.filename_download || mimeType !== file.type || byteSize !== Number(file.filesize)) {
    throw new MediaAssetGovernanceError('MEDIA_FILE_METADATA_MISMATCH', 'Media asset metadata does not match the uploaded file');
  }
  reviewerRoleForMediaUsageScope(input?.usage_scope);
  const copyrightStatus = requiredText(input?.copyright_status, 'copyright_status').toLowerCase();
  if (!copyrightStatuses.has(copyrightStatus)) {
    throw new MediaAssetGovernanceError('MEDIA_COPYRIGHT_STATUS_INVALID', 'A supported copyright status is required');
  }
  return input;
}

export function collectMediaAssetReferenceIds(record) {
  const references = [];
  for (const field of directAssetFields) {
    if (record?.[field] == null || record[field] === '') continue;
    references.push(requiredText(record[field], field));
  }
  for (const field of listAssetFields) {
    for (const entry of asList(record?.[field], field)) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        throw new MediaAssetGovernanceError('MEDIA_REFERENCE_INVALID', `${field} entries must be objects with media_asset_id`);
      }
      const mediaAssetId = assetIdText(entry.media_asset_id);
      if (!mediaAssetId) throw new MediaAssetGovernanceError('MEDIA_REFERENCE_INVALID', `${field} entries must include media_asset_id`);
      references.push(mediaAssetId);
    }
  }
  return [...new Set(references)];
}

export function assertPublishedMediaReferences(record, assetsById) {
  if (!protectedStatuses.has(record?.status)) return [];
  const references = collectMediaAssetReferenceIds(record);
  const getAsset = assetsById instanceof Map
    ? (id) => assetsById.get(id) || assetsById.get(Number(id))
    : (id) => assetsById?.[id];
  for (const id of references) {
    const asset = getAsset(id);
    if (asset?.status !== 'published' || asset?.publication_state !== 'published') {
      throw new MediaAssetGovernanceError('MEDIA_NOT_PUBLISHED', `Referenced media asset ${id} is not published`);
    }
  }
  return references;
}

export const publicMediaUploadRules = uploadRules;
