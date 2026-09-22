import { pageAllowsPreviewMedia } from '../../../content-preview/page-preview-media-policy.mjs';
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
import { createPreviewMediaGrantStore } from '../../../content-preview/preview-media-grants.mjs';

const editableStatuses = new Set(['draft', 'rejected', 'unpublished']);
const pagePreviewRelations = Object.freeze({
  product: ['product_series', 'product_models', 'product_parameters', 'site_settings'],
  manufacturing: ['manufacturing_evidence', 'site_settings'],
  news: ['articles', 'site_settings'],
  about: ['milestones', 'qualifications', 'site_settings'],
  service: ['service_resources', 'service_locations', 'site_settings'],
  home: ['product_series', 'milestones', 'site_settings']
});

// A collection-rooted visual edit still needs its complete on-page list.
// Keep this as an allowlist rather than returning arbitrary collections.
const recordPreviewRelations = Object.freeze({
  product_series: pagePreviewRelations.product,
  product_models: pagePreviewRelations.product,
  product_parameters: pagePreviewRelations.product,
  manufacturing_evidence: pagePreviewRelations.manufacturing,
  articles: pagePreviewRelations.news,
  milestones: pagePreviewRelations.about,
  qualifications: pagePreviewRelations.about,
  service_resources: pagePreviewRelations.service,
  service_locations: pagePreviewRelations.service
});

const recordPreviewPageSlugs = Object.freeze({
  service_resources: ['service'],
  service_locations: ['service']
});

async function relatedPreview(database, collections) {
  const related = {};
  for (const collection of collections) {
    const rows = await database(collection);
    const records = Array.isArray(rows) ? rows : [];
    const drafts = records
      .filter((record) => editableStatuses.has(record?.status) && record?.publication_state !== 'published')
      .map((record) => previewContentRecord(collection, record))
      .filter(Boolean);
    if (drafts.length) related[collection] = drafts;
  }
  return Object.keys(related).length ? related : undefined;
}

async function relatedPagePreview(database, page) {
  return relatedPreview(database, pagePreviewRelations[String(page?.slug || '').trim().toLowerCase()] || []);
}

async function relatedRecordPreview(database, collection) {
  const normalizedCollection = String(collection || '').trim();
  const related = await relatedPreview(database, recordPreviewRelations[normalizedCollection] || []);
  const allowedSlugs = recordPreviewPageSlugs[normalizedCollection] || [];
  if (!allowedSlugs.length) return related;

  const pages = await database('pages');
  const pageRecords = (Array.isArray(pages) ? pages : [])
    .filter((record) => allowedSlugs.includes(String(record?.slug || '').trim().toLowerCase()))
    .filter((record) => editableStatuses.has(record?.status) && record?.publication_state !== 'published')
    .map((record) => previewContentRecord('pages', record))
    .filter(Boolean);
  if (!pageRecords.length) return related;
  return { ...(related || {}), pages: pageRecords };
}

function previewOpenUrl(value = process.env.WEBSITE_PREVIEW_OPEN_URL) {
  const url = String(value || '').trim();
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? parsed.toString() : '';
  } catch {
    return '';
  }
}

function previewAllowedHosts(value = process.env.WEBSITE_PREVIEW_ALLOWED_HOSTS) {
  return new Set(String(value || '').split(',').map((host) => host.trim().toLowerCase()).filter(Boolean));
}

export function resolvePreviewOpenUrl(value, requestHostname, allowedHostsValue) {
  const configured = previewOpenUrl(value);
  if (!configured) return '';
  const parsed = new URL(configured);
  const requestedHost = String(requestHostname || '').trim().toLowerCase();
  const allowedHosts = previewAllowedHosts(allowedHostsValue);
  allowedHosts.add(parsed.hostname.toLowerCase());
  if (requestedHost && allowedHosts.has(requestedHost)) parsed.hostname = requestedHost;
  return parsed.toString();
}

async function roleName(database, accountability) {
  if (accountability?.admin) return '系统管理员';
  if (!accountability?.user || !accountability?.role) return null;
  const role = await database('directus_roles').where({ id: accountability.role }).first();
  if (role?.name === 'Administrator' || role?.name === 'Admin') return '系统管理员';
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

function databaseDate(iso) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  const pad = (value) => String(value).padStart(2, '0');
  // MySQL DATETIME has no timezone. Store local wall-clock fields so that
  // Directus/Knex parses the value back to the original UTC instant.
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function responseError(res, status, message, code) {
  return res.status(status).json({ errors: [{ message, extensions: { code } }] });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function previewLaunchDocument(openUrl, token) {
  const destination = new URL(openUrl);
  destination.pathname = '/cms-preview-handoff';
  destination.search = '';
  destination.hash = `cmsPreviewToken=${encodeURIComponent(token)}`;
  return `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${escapeHtml(destination.toString())}"><title>正在打开官网预览</title></head>
<body style="margin:0;display:grid;min-height:100vh;place-items:center;background:#f2f2ef;color:#17191b;font-family:Arial,'Microsoft YaHei',sans-serif">
  <a href="${escapeHtml(destination.toString())}" style="color:inherit">正在打开官网草稿预览...</a>
</body>
</html>`;
}

function previewErrorDocument(message) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>无法打开预览</title></head><body style="padding:40px;font-family:Arial,'Microsoft YaHei',sans-serif"><h1>无法打开官网预览</h1><p>${escapeHtml(message)}</p></body></html>`;
}

async function issuePreview({ database, accountability, input, now, randomBytes, websitePreviewOpenUrl, websitePreviewAllowedHosts, requestHostname }) {
  const user = await actor(database, accountability);
  if (!user) return { error: [403, '当前账号没有签发草稿预览令牌的权限。', 'PREVIEW_ISSUE_FORBIDDEN'] };
  const target = normalizePreviewTarget(input?.contentCollection, input?.contentItemId);
  if (!target || !user.scopes.has(target.contentCollection)) return { error: [400, '预览内容类型或内容编号无效。', 'PREVIEW_TARGET_INVALID'] };
  const ttlSeconds = normalizeTtlSeconds(input?.ttlSeconds);
  if (!ttlSeconds) return { error: [400, '预览有效期必须为 60 至 1800 秒。', 'PREVIEW_TTL_INVALID'] };
  const record = await database(target.contentCollection).where({ id: target.contentItemId }).first();
  if (!record) return { error: [404, '预览内容不存在。', 'PREVIEW_CONTENT_NOT_FOUND'] };
  if (!editableStatuses.has(record.status) || record.publication_state === 'published') {
    return { error: [409, '只有未公开草稿内容可以创建预览。', 'PREVIEW_CONTENT_NOT_DRAFT'] };
  }
  const createdAt = nowIso(now);
  const expiresAt = new Date(Date.parse(createdAt) + ttlSeconds * 1000).toISOString();
  const generated = createPreviewToken(randomBytes);
  const inserted = await database('content_preview_tokens').insert({
    token_hash: generated.tokenHash,
    content_collection: target.contentCollection,
    content_item_id: target.contentItemId,
    issued_by: user.id,
    created_at: databaseDate(createdAt),
    expires_at: databaseDate(expiresAt),
    use_count: 0,
    status: 'active',
    publication_state: 'private'
  });
  const id = Array.isArray(inserted) ? inserted[0] : inserted;
  return { data: { token: generated.token, preview_open_url: resolvePreviewOpenUrl(websitePreviewOpenUrl, requestHostname, websitePreviewAllowedHosts), ...previewTokenView({ id, content_collection: target.contentCollection, content_item_id: target.contentItemId, issued_by: user.id, created_at: createdAt, expires_at: expiresAt, use_count: 0, status: 'active' }) } };
}

export function registerContentPreviewTokenEndpoint(router, { database, now = () => new Date(), randomBytes, websitePreviewOpenUrl, websitePreviewAllowedHosts } = {}) {
  if (!database) throw new TypeError('database is required');
  const mediaGrants = createPreviewMediaGrantStore();
  router.post('/media/issue', async (req, res, next) => {
    try {
      const user = await actor(database, req.accountability);
      if (!user) return responseError(res, 403, '当前账号不能授权预览素材。', 'PREVIEW_MEDIA_FORBIDDEN');
      const target = normalizePreviewTarget(req.body?.contentCollection, req.body?.contentItemId);
      const assetId = String(req.body?.assetId || '');
      if (!target || !['articles', 'pages', 'service_resources', 'product_series', 'product_models', 'qualifications'].includes(target.contentCollection) || !user.scopes.has(target.contentCollection) || !/^[1-9]\d*$/.test(assetId)) return responseError(res, 400, '预览素材目标无效。', 'PREVIEW_MEDIA_INVALID');
      const record = await database(target.contentCollection).where({ id: target.contentItemId }).first();
      const asset = await database('media_assets').where({ id: assetId }).first();
      const homeHero = target.contentCollection === 'pages' && record?.slug === 'home'
        && asset?.usage_scope === 'homepage' && asset?.page_key === 'home' && asset?.section_key === 'hero'
        && asset?.media_type === 'video' && asset?.placement_key === 'home.hero.video';
      const articlePlacement = target.contentCollection === 'articles' && (record?.category === 'news'
        ? asset?.media_type === 'image' && asset?.placement_key === 'news.dynamic_news.cover' && asset?.section_key === 'dynamic-news'
        : record?.category === 'video' && asset?.media_type === 'video' && asset?.placement_key === 'news.video_share.list' && asset?.section_key === 'video-sharing');
      const servicePlacement = target.contentCollection === 'service_resources' && asset?.usage_scope === 'service' && asset?.page_key === 'service'
        && ((asset?.placement_key === 'service.document' && asset?.media_type === 'document')
          || (asset?.placement_key === 'service.tutorial.video' && asset?.media_type === 'video')
          || (asset?.placement_key === 'service.tutorial.poster' && asset?.media_type === 'image' && asset?.section_key === 'download'));
      const productAttachment = target.contentCollection === 'product_models' && asset?.usage_scope === 'product' && asset?.page_key === 'product'
        && asset?.placement_key === 'product.document' && asset?.media_type === 'document';
      const productGallery = target.contentCollection === 'product_models' && asset?.usage_scope === 'product' && asset?.page_key === 'product'
        && asset?.placement_key === 'product.gallery.image' && asset?.media_type === 'image';
      const productSeriesCover = target.contentCollection === 'product_series' && asset?.usage_scope === 'product' && asset?.page_key === 'product'
        && asset?.placement_key === 'product.gallery.image' && asset?.media_type === 'image';
      const pagePlacement = target.contentCollection === 'pages' && pageAllowsPreviewMedia(record, asset);
      const qualificationSection = new Map([['certificate', 'certificates'], ['honor', 'honors'], ['patent', 'patents']]).get(record?.type);
      const qualificationPlacement = target.contentCollection === 'qualifications' && qualificationSection
        && asset?.usage_scope === 'qualification' && asset?.page_key === 'about' && asset?.section_key === qualificationSection
        && asset?.placement_key === 'qualification.image' && asset?.media_type === 'image';
      const matchesPlacement = homeHero || pagePlacement || servicePlacement || productAttachment || productGallery || productSeriesCover || qualificationPlacement || (articlePlacement && asset?.usage_scope === 'article' && asset?.page_key === 'news');
      const eligible = matchesPlacement && editableStatuses.has(record?.status) && record?.publication_state !== 'published'
        && asset?.file_id && asset.enabled !== false && asset.enabled !== 0
        && ((asset.status === 'draft' && asset.publication_state === 'unpublished') || (asset.status === 'published' && asset.publication_state === 'published'));
      if (!eligible) return responseError(res, 400, '素材不适用于当前内容或展示位置。', 'PREVIEW_MEDIA_INVALID');
      const token = mediaGrants.issue({ collection: target.contentCollection, itemId: target.contentItemId, assetId });
      return res.status(201).json({ data: { token } });
    } catch (error) { return next(error); }
  });
  router.post('/media/consume', (req, res) => {
    const result = mediaGrants.consume(req.body?.token, { collection: req.body?.contentCollection, itemId: req.body?.contentItemId });
    if (!result) return responseError(res, 404, '素材许可不存在或已失效。', 'PREVIEW_MEDIA_GRANT_INVALID');
    return res.status(200).json({ data: result });
  });

  router.post('/issue', async (req, res, next) => {
    try {
      const result = await issuePreview({ database, accountability: req.accountability, input: req.body, now, randomBytes, websitePreviewOpenUrl, websitePreviewAllowedHosts, requestHostname: req.hostname });
      if (result.error) return responseError(res, ...result.error);
      return res.status(201).json({ data: result.data });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/open', async (req, res, next) => {
    try {
      const openUrl = resolvePreviewOpenUrl(websitePreviewOpenUrl, req.hostname, websitePreviewAllowedHosts);
      if (!openUrl) return res.status(503).type('html').send(previewErrorDocument('官网预览地址尚未配置，请联系系统管理员。'));
      const result = await issuePreview({
        database,
        accountability: req.accountability,
        input: { contentCollection: req.query?.contentCollection, contentItemId: req.query?.contentItemId, ttlSeconds: 900 },
        now,
        randomBytes,
        websitePreviewOpenUrl,
        websitePreviewAllowedHosts,
        requestHostname: req.hostname
      });
      if (result.error) return res.status(result.error[0]).type('html').send(previewErrorDocument(result.error[1]));
      return res.status(200).type('html').send(previewLaunchDocument(openUrl, result.data.token));
    } catch (error) {
      return next(error);
    }
  });

  router.get('/auto-submit.js', (_req, res) => {
    return res.status(200).type('application/javascript').send('document.forms[0]?.submit();');
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
      if (row.content_collection === 'pages') {
        const related = await relatedPagePreview(database, record);
        if (related) preview.related = related;
      } else {
        const related = await relatedRecordPreview(database, row.content_collection);
        if (related) preview.related = related;
      }
      const usedAt = nowIso(now);
      const updated = await database('content_preview_tokens').where({ id: row.id, status: 'active' }).update({ status: 'used', used_at: databaseDate(usedAt), use_count: 1 });
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
