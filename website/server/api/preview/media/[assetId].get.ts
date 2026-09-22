import { Readable } from 'node:stream';
import { createError, getCookie, getRouterParam, sendStream, setResponseHeader } from 'h3';
import { collectPreviewMediaAssetIds } from '../../../services/cms-preview-media.mjs';
import { CMS_PREVIEW_SESSION_COOKIE, useCmsPreviewSessionStore } from '../../../services/cms-preview-session-store.mjs';

function isPreviewAsset(record: Record<string, any> | null) {
  return Boolean(record?.file_id && record?.enabled !== false && (
    (record.status === 'draft' && record.publication_state === 'unpublished')
    || (record.status === 'published' && record.publication_state === 'published')
  ));
}

export default defineEventHandler(async (event) => {
  const session = useCmsPreviewSessionStore().get(getCookie(event, CMS_PREVIEW_SESSION_COOKIE));
  if (!session) throw createError({ statusCode: 401, statusMessage: '草稿预览会话不存在或已过期' });
  const assetId = String(getRouterParam(event, 'assetId') || '').trim();
  if (!collectPreviewMediaAssetIds(session.data.preview).has(assetId)) throw createError({ statusCode: 404, statusMessage: '预览素材不存在' });

  const config = useRuntimeConfig(event);
  const endpoint = String(config.cmsMediaAssetsUrl || '').trim();
  const token = String(config.cmsBffToken || '').trim();
  if (!endpoint || !token) throw createError({ statusCode: 503, statusMessage: '草稿预览素材服务尚未配置' });

  let item: Record<string, any> | null = null;
  try {
    const metadata = await fetch(`${endpoint.replace(/\/$/, '')}/${encodeURIComponent(assetId)}?fields=id,file_id,mime_type,enabled,status,publication_state`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    });
    const body = metadata.ok ? await metadata.json() : null;
    item = body?.data || null;
  } catch { /* converted to the same non-revealing response below */ }
  if (!isPreviewAsset(item)) throw createError({ statusCode: 404, statusMessage: '预览素材不存在' });

  const cmsOrigin = new URL(endpoint).origin;
  const response = await fetch(`${cmsOrigin}/assets/${encodeURIComponent(item.file_id)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok || !response.body) throw createError({ statusCode: 502, statusMessage: '草稿预览素材暂时不可用' });
  setResponseHeader(event, 'cache-control', 'private, no-store');
  setResponseHeader(event, 'content-type', response.headers.get('content-type') || item.mime_type || 'application/octet-stream');
  return sendStream(event, Readable.fromWeb(response.body as never));
});
