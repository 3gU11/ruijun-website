import { createError, getCookie, readBody } from 'h3';
import { CMS_PREVIEW_SESSION_COOKIE, useCmsPreviewSessionStore } from '../../services/cms-preview-session-store.mjs';
import { authorizePreviewMediaGrant } from '../../services/cms-preview-media-grant.mjs';

export default defineEventHandler(async event => {
  const session = useCmsPreviewSessionStore().get(getCookie(event, CMS_PREVIEW_SESSION_COOKIE));
  if (!session) throw createError({ statusCode: 401, statusMessage: '预览会话已失效' });
  const input = await readBody(event);
  const config = useRuntimeConfig(event);
  try {
    const assetId = await authorizePreviewMediaGrant({ session, input, consume: async (target: any) => {
      const endpoint = String(config.cmsPreviewTokensUrl || '').replace(/\/(?:consume)\/?$/, '').replace(/\/$/, '');
      const response = await fetch(`${endpoint}/media/consume`, {
        method: 'POST', signal: AbortSignal.timeout(10000),
        headers: { 'content-type': 'application/json', authorization: `Bearer ${config.cmsBffToken}` },
        body: JSON.stringify({ token: target.token, contentCollection: target.collection, contentItemId: target.itemId })
      });
      if (!response.ok) throw Error('Grant rejected');
      return (await response.json()).data;
    }});
    return { data: { assetId } };
  } catch { throw createError({ statusCode: 403, statusMessage: '素材预览许可无效，请重新打开预览' }); }
});
