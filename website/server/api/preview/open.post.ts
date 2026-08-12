import { createError, getRequestURL, readBody, sendRedirect, setCookie } from 'h3';
import { CmsPreviewError, createCmsPreviewReader } from '../../services/cms-preview-reader.mjs';
import { CMS_PREVIEW_SESSION_COOKIE, useCmsPreviewSessionStore } from '../../services/cms-preview-session-store.mjs';

// A CMS form post exchanges the token before the browser reaches /preview.
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
    return sendRedirect(event, '/preview', 303);
  } catch (error) {
    if (error instanceof CmsPreviewError) throw createError({ statusCode: error.status, statusMessage: error.message, data: { code: error.code } });
    throw error;
  }
});
