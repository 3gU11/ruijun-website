import { createHash, randomBytes } from 'node:crypto';

export const PREVIEW_TOKEN_DEFAULT_TTL_SECONDS = 15 * 60;
export const PREVIEW_TOKEN_MIN_TTL_SECONDS = 60;
export const PREVIEW_TOKEN_MAX_TTL_SECONDS = 30 * 60;

export const previewableCollections = Object.freeze(new Set([
  'pages', 'product_series', 'product_models', 'product_parameters', 'case_studies', 'articles',
  'manufacturing_evidence', 'qualifications', 'milestones', 'service_resources', 'service_locations',
  'knowledge_items', 'external_service_entries', 'site_settings'
]));

export const previewIssuerScopes = Object.freeze({
  '内容编辑': previewableCollections,
  '审核管理': new Set(['pages', 'product_series', 'case_studies', 'articles', 'manufacturing_evidence', 'qualifications', 'milestones', 'service_locations']),
  '系统管理员': previewableCollections
});

export function normalizePreviewToken(value) {
  const token = typeof value === 'string' ? value.trim() : '';
  return /^[A-Za-z0-9_-]{32,160}$/.test(token) ? token : null;
}

export function hashPreviewToken(token) {
  const normalized = normalizePreviewToken(token);
  if (!normalized) throw new TypeError('Preview token is invalid');
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

export function createPreviewToken(random = randomBytes) {
  const token = random(48).toString('base64url');
  return { token, tokenHash: hashPreviewToken(token) };
}

export function normalizePreviewTarget(collection, itemId) {
  const contentCollection = typeof collection === 'string' ? collection.trim() : '';
  const contentItemId = typeof itemId === 'string' || Number.isSafeInteger(itemId) ? String(itemId).trim() : '';
  if (!previewableCollections.has(contentCollection)) return null;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(contentItemId)) return null;
  return { contentCollection, contentItemId };
}

export function normalizeTtlSeconds(value) {
  if (value == null || value === '') return PREVIEW_TOKEN_DEFAULT_TTL_SECONDS;
  const ttl = Number(value);
  if (!Number.isInteger(ttl) || ttl < PREVIEW_TOKEN_MIN_TTL_SECONDS || ttl > PREVIEW_TOKEN_MAX_TTL_SECONDS) return null;
  return ttl;
}

export function isPreviewTokenExpired(row, now = new Date()) {
  const expiresAt = Date.parse(row?.expires_at || '');
  return !Number.isFinite(expiresAt) || expiresAt <= now.getTime();
}

export function previewTokenView(row) {
  if (!row) return null;
  return {
    id: row.id,
    content_collection: row.content_collection,
    content_item_id: String(row.content_item_id),
    issued_by: row.issued_by,
    created_at: row.created_at,
    expires_at: row.expires_at,
    used_at: row.used_at || null,
    revoked_at: row.revoked_at || null,
    revoked_by: row.revoked_by || null,
    use_count: Number(row.use_count || 0),
    status: row.status
  };
}
