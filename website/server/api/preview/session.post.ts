import { createError, getRequestURL, readBody, setCookie } from 'h3';
import { CmsPreviewError, createCmsPreviewReader } from '../../services/cms-preview-reader.mjs';
import { CMS_PREVIEW_SESSION_COOKIE, useCmsPreviewSessionStore } from '../../services/cms-preview-session-store.mjs';

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null) as { token?: unknown } | null;
  const config = useRuntimeConfig(event);
  const reader = createCmsPreviewReader({
    consumeEndpoint: String(config.cmsPreviewTokensUrl || ''),
    accessToken: String(config.cmsBffToken || ''),
    sessionStore: useCmsPreviewSessionStore()
  });
  try {
    const session = await reader.createSession(body?.token);
    setCookie(event, CMS_PREVIEW_SESSION_COOKIE, session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: getRequestURL(event).protocol === 'https:',
      path: '/',
      maxAge: Math.max(1, Math.round(reader.sessionTtlMs / 1000))
    });
    return { data: { expires_at: session.expiresAt, content_collection: session.collection, content_item_id: session.itemId } };
  } catch (error) {
    if (error instanceof CmsPreviewError) throw createError({ statusCode: error.status, statusMessage: error.message, data: { code: error.code } });
    throw error;
  }
});

