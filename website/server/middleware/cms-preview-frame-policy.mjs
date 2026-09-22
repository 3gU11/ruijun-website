import { defineEventHandler, getQuery, getRequestURL, removeResponseHeader, setResponseHeader } from 'h3';
import { useRuntimeConfig } from '#imports';
import { createCmsPreviewFramePolicy } from '../utils/cms-preview-frame-policy.mjs';

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const pathname = getRequestURL(event).pathname;
  const isPreview = String(query.cmsPreview || '') === '1' || pathname === '/cms-preview-handoff';
  const config = useRuntimeConfig(event);
  const policy = createCmsPreviewFramePolicy({
    isPreview,
    allowedOrigins: config.public.cmsPreviewOrigins || config.public.cmsPreviewOrigin
  });

  if (isPreview) removeResponseHeader(event, 'x-frame-options');
  if (isPreview) setResponseHeader(event, 'content-security-policy', policy['content-security-policy']);
  else setResponseHeader(event, 'x-frame-options', policy['x-frame-options']);
});
