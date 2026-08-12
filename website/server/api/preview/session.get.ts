import { createError, getCookie } from 'h3';
import { CMS_PREVIEW_SESSION_COOKIE, useCmsPreviewSessionStore } from '../../services/cms-preview-session-store.mjs';

export default defineEventHandler((event) => {
  const id = getCookie(event, CMS_PREVIEW_SESSION_COOKIE);
  const session = useCmsPreviewSessionStore().get(id);
  if (!session) throw createError({ statusCode: 401, statusMessage: '草稿预览会话不存在或已过期' });
  return { data: session.data, expires_at: session.expiresAt };
});

