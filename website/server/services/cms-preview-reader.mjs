import { CMS_PREVIEW_SESSION_TTL_MS, useCmsPreviewSessionStore } from './cms-preview-session-store.mjs';

export class CmsPreviewError extends Error {
  constructor(message, { status = 502, code = 'PREVIEW_UPSTREAM_ERROR' } = {}) {
    super(message);
    this.name = 'CmsPreviewError';
    this.status = status;
    this.code = code;
  }
}

function validToken(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{32,160}$/.test(value.trim()) ? value.trim() : null;
}

function errorFromCms(status, body) {
  const item = Array.isArray(body?.errors) ? body.errors[0] : null;
  const code = String(item?.extensions?.code || 'PREVIEW_UPSTREAM_ERROR');
  const statusMap = {
    PREVIEW_TOKEN_INVALID: 400,
    PREVIEW_TOKEN_NOT_FOUND: 404,
    PREVIEW_TOKEN_EXPIRED: 410,
    PREVIEW_TOKEN_REVOKED: 410,
    PREVIEW_TOKEN_USED: 409,
    PREVIEW_CONTENT_NOT_FOUND: 404,
    PREVIEW_COLLECTION_UNSUPPORTED: 422
  };
  return new CmsPreviewError('草稿预览令牌不可用。', { status: statusMap[code] || (status >= 400 && status < 500 ? status : 502), code });
}

export function createCmsPreviewReader({ consumeEndpoint, accessToken = '', fetchImpl = fetch, sessionStore = useCmsPreviewSessionStore(), now = () => Date.now() } = {}) {
  const configuredEndpoint = String(consumeEndpoint || '').trim().replace(/\/$/, '');
  const endpoint = configuredEndpoint && !configuredEndpoint.endsWith('/consume') ? `${configuredEndpoint}/consume` : configuredEndpoint;

  async function consume(rawToken) {
    const token = validToken(rawToken);
    if (!token) throw new CmsPreviewError('预览令牌格式无效。', { status: 400, code: 'PREVIEW_TOKEN_INVALID' });
    if (!endpoint) throw new CmsPreviewError('官网尚未配置草稿预览服务。', { status: 404, code: 'PREVIEW_NOT_CONFIGURED' });
    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ token })
      });
    } catch {
      throw new CmsPreviewError('CMS 草稿预览服务暂时不可用。');
    }
    let body = null;
    try { body = await response.json(); } catch { /* handled below */ }
    if (!response.ok) throw errorFromCms(response.status, body);
    const data = body?.data;
    if (!data?.preview || !data.content_collection || data.content_item_id == null || !data.expires_at) {
      throw new CmsPreviewError('CMS 返回的预览内容不完整。', { code: 'PREVIEW_RESPONSE_INVALID' });
    }
    const expiresAt = Date.parse(data.expires_at);
    if (!Number.isFinite(expiresAt) || expiresAt <= now()) throw new CmsPreviewError('预览令牌已过期。', { status: 410, code: 'PREVIEW_TOKEN_EXPIRED' });
    return {
      collection: String(data.content_collection),
      itemId: String(data.content_item_id),
      preview: data.preview,
      expiresAt: new Date(expiresAt).toISOString()
    };
  }

  async function createSession(rawToken) {
    const payload = await consume(rawToken);
    const session = sessionStore.create(payload);
    return { ...session, collection: payload.collection, itemId: payload.itemId };
  }

  return Object.freeze({ consume, createSession, sessionTtlMs: CMS_PREVIEW_SESSION_TTL_MS });
}
