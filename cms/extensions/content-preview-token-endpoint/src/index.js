import {
  createPreviewToken,
  hashPreviewToken,
  isPreviewTokenExpired,
  normalizePreviewTarget,
  normalizePreviewToken,
  normalizeTtlSeconds,
  previewIssuerScopes,
  previewTokenView
} from '../../../content-preview/content-preview-token.mjs';
import { previewContentRecord } from '../../../content-preview/content-preview-content.mjs';

const editableStatuses = new Set(['draft', 'rejected', 'unpublished']);

function previewOpenUrl(value = process.env.WEBSITE_PREVIEW_OPEN_URL) {
  const url = String(value || '').trim();
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? parsed.toString() : '';
  } catch {
    return '';
  }
}

async function roleName(database, accountability) {
  if (accountability?.admin) return '系统管理员';
  if (!accountability?.user || !accountability?.role) return null;
  const role = await database('directus_roles').where({ id: accountability.role }).first();
  return role?.name || null;
}

async function actor(database, accountability) {
  const name = await roleName(database, accountability);
  if (!name || !accountability?.user || !previewIssuerScopes[name]) return null;
  return { id: String(accountability.user), name, scopes: previewIssuerScopes[name] };
}

function nowIso(now) {
  const value = now instanceof Date ? now : new Date(now());
  return value.toISOString();
}

function responseError(res, status, message, code) {
  return res.status(status).json({ errors: [{ message, extensions: { code } }] });
}

export function registerContentPreviewTokenEndpoint(router, { database, now = () => new Date(), randomBytes, websitePreviewOpenUrl } = {}) {
  if (!database) throw new TypeError('database is required');

  router.post('/issue', async (req, res, next) => {
    try {
      const user = await actor(database, req.accountability);
      if (!user) return responseError(res, 403, '当前账号没有签发草稿预览令牌的权限。', 'PREVIEW_ISSUE_FORBIDDEN');
      const target = normalizePreviewTarget(req.body?.contentCollection, req.body?.contentItemId);
      if (!target || !user.scopes.has(target.contentCollection)) return responseError(res, 400, '预览内容类型或内容编号无效。', 'PREVIEW_TARGET_INVALID');
      const ttlSeconds = normalizeTtlSeconds(req.body?.ttlSeconds);
      if (!ttlSeconds) return responseError(res, 400, '预览有效期必须为 60 至 1800 秒。', 'PREVIEW_TTL_INVALID');
      const record = await database(target.contentCollection).where({ id: target.contentItemId }).first();
      if (!record) return responseError(res, 404, '预览内容不存在。', 'PREVIEW_CONTENT_NOT_FOUND');
      if (!editableStatuses.has(record.status) || record.publication_state === 'published') {
        return responseError(res, 409, '只有未公开草稿内容可以创建预览。', 'PREVIEW_CONTENT_NOT_DRAFT');
      }
      const createdAt = nowIso(now);
      const expiresAt = new Date(Date.parse(createdAt) + ttlSeconds * 1000).toISOString();
      const generated = createPreviewToken(randomBytes);
      const inserted = await database('content_preview_tokens').insert({
        token_hash: generated.tokenHash,
        content_collection: target.contentCollection,
        content_item_id: target.contentItemId,
        issued_by: user.id,
        created_at: createdAt,
        expires_at: expiresAt,
        use_count: 0,
        status: 'active',
        publication_state: 'private'
      });
      const id = Array.isArray(inserted) ? inserted[0] : inserted;
      return res.status(201).json({ data: { token: generated.token, preview_open_url: previewOpenUrl(websitePreviewOpenUrl), ...previewTokenView({ id, content_collection: target.contentCollection, content_item_id: target.contentItemId, issued_by: user.id, created_at: createdAt, expires_at: expiresAt, use_count: 0, status: 'active' }) } });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/consume', async (req, res, next) => {
    try {
      const token = normalizePreviewToken(req.body?.token);
      if (!token) return responseError(res, 400, '预览令牌无效。', 'PREVIEW_TOKEN_INVALID');
      const tokenHash = hashPreviewToken(token);
      const row = await database('content_preview_tokens').where({ token_hash: tokenHash }).first();
      if (!row) return responseError(res, 404, '预览令牌不存在。', 'PREVIEW_TOKEN_NOT_FOUND');
      if (row.status === 'revoked' || row.revoked_at) return responseError(res, 410, '预览令牌已撤销。', 'PREVIEW_TOKEN_REVOKED');
      if (row.status === 'used' || row.used_at || Number(row.use_count || 0) > 0) return responseError(res, 409, '预览令牌已经使用过。', 'PREVIEW_TOKEN_USED');
      if (isPreviewTokenExpired(row, new Date(nowIso(now)))) {
        await database('content_preview_tokens').where({ id: row.id, status: 'active' }).update({ status: 'expired' });
        return responseError(res, 410, '预览令牌已过期。', 'PREVIEW_TOKEN_EXPIRED');
      }
      const record = await database(row.content_collection).where({ id: row.content_item_id }).first();
      if (!record) return responseError(res, 404, '预览内容不存在或已删除。', 'PREVIEW_CONTENT_NOT_FOUND');
      const preview = previewContentRecord(row.content_collection, record);
      if (!preview) return responseError(res, 400, '该内容类型不支持安全预览。', 'PREVIEW_COLLECTION_UNSUPPORTED');
      const usedAt = nowIso(now);
      const updated = await database('content_preview_tokens').where({ id: row.id, status: 'active' }).update({ status: 'used', used_at: usedAt, use_count: 1 });
      if (!updated) return responseError(res, 409, '预览令牌已经使用过。', 'PREVIEW_TOKEN_USED');
      const current = { ...row, status: 'used', used_at: usedAt, use_count: 1 };
      return res.status(200).json({ data: { ...previewTokenView(current), preview } });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/:id/revoke', async (req, res, next) => {
    try {
      const user = await actor(database, req.accountability);
      if (!user) return responseError(res, 403, '当前账号没有撤销预览令牌的权限。', 'PREVIEW_REVOKE_FORBIDDEN');
      const id = String(req.params?.id || '').trim();
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return responseError(res, 400, '预览令牌编号无效。', 'PREVIEW_ID_INVALID');
      const row = await database('content_preview_tokens').where({ id }).first();
      if (!row) return responseError(res, 404, '预览令牌不存在。', 'PREVIEW_TOKEN_NOT_FOUND');
      if (user.name !== '系统管理员' && user.name !== '审核管理' && String(row.issued_by) !== user.id) {
        return responseError(res, 403, '当前账号不能撤销该预览令牌。', 'PREVIEW_REVOKE_FORBIDDEN');
      }
      if (row.status === 'used') return responseError(res, 409, '已使用的预览令牌不能撤销。', 'PREVIEW_TOKEN_USED');
      if (row.status === 'revoked') return res.status(200).json({ data: previewTokenView(row) });
      const revokedAt = nowIso(now);
      await database('content_preview_tokens').where({ id, status: 'active' }).update({ status: 'revoked', revoked_at: revokedAt, revoked_by: user.id });
      return res.status(200).json({ data: previewTokenView({ ...row, status: 'revoked', revoked_at: revokedAt, revoked_by: user.id }) });
    } catch (error) {
      return next(error);
    }
  });
}

export default {
  id: 'content-preview-tokens',
  handler(router, context) {
    registerContentPreviewTokenEndpoint(router, context);
  }
};
