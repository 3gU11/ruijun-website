import { deleteCookie, getCookie } from 'h3';
import { CMS_PREVIEW_SESSION_COOKIE, useCmsPreviewSessionStore } from '../../services/cms-preview-session-store.mjs';

export default defineEventHandler((event) => {
  useCmsPreviewSessionStore().revoke(getCookie(event, CMS_PREVIEW_SESSION_COOKIE));
  deleteCookie(event, CMS_PREVIEW_SESSION_COOKIE, { path: '/' });
  return { data: { revoked: true } };
});

