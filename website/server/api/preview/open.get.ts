import { createError, getRequestURL, getQuery, sendRedirect, setCookie } from 'h3';
import { CmsPreviewError, createCmsPreviewReader } from '../../services/cms-preview-reader.mjs';
import { CMS_PREVIEW_SESSION_COOKIE, useCmsPreviewSessionStore } from '../../services/cms-preview-session-store.mjs';
import { previewTargetLocation, resolveCmsPreviewTarget } from '../../services/cms-preview-target.mjs';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const config = useRuntimeConfig(event);
  const reader = createCmsPreviewReader({
    consumeEndpoint: String(config.cmsPreviewTokensUrl || ''),
    accessToken: String(config.cmsBffToken || ''),
    sessionStore: useCmsPreviewSessionStore()
  });
  try {
    const session = await reader.createSession(String(query.token || ''), { sectionKey: String(query.sectionKey || '') });
    setCookie(event, CMS_PREVIEW_SESSION_COOKIE, session.id, {
      httpOnly: true, sameSite: 'lax', secure: getRequestURL(event).protocol === 'https:', path: '/',
      maxAge: Math.max(1, Math.round(reader.sessionTtlMs / 1000))
    });
    const target = resolveCmsPreviewTarget(session.collection, { ...(session.data?.preview || {}), section_key: session.data?.targetContext?.sectionKey || session.data?.preview?.section_key });
    return sendRedirect(event, previewTargetLocation(target), 303);
  } catch (error) {
    if (error instanceof CmsPreviewError) throw createError({ statusCode: error.status, statusMessage: error.message, data: { code: error.code } });
    throw error;
  }
});
