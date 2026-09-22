const normalizeOrigins = (value) => String(value || '')
  .split(/[\s,]+/)
  .map((origin) => origin.trim())
  .filter((origin) => /^https?:\/\/[^\s/]+(?::\d+)?$/.test(origin));

export const createCmsPreviewFramePolicy = ({ isPreview, allowedOrigins }) => {
  if (!isPreview) return Object.freeze({ 'x-frame-options': 'SAMEORIGIN' });

  const origins = normalizeOrigins(allowedOrigins);
  return Object.freeze({
    'content-security-policy': origins.length ? `frame-ancestors ${origins.join(' ')}` : "frame-ancestors 'none'"
  });
};

