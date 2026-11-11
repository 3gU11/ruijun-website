const normalizeOrigins = (value) => String(value || '')
  .split(/[\s,]+/)
  .map((origin) => origin.trim())
  .filter((origin) => /^https?:\/\/[^\s/]+(?::\d+)?$/.test(origin));

export const createCmsPreviewFramePolicy = ({ isPreview, allowedOrigins }) => {
  const origins = normalizeOrigins(allowedOrigins);
  // The CMS canvas can reach the website through a LAN host or localhost.
  // X-Frame-Options cannot express that allow-list and causes Firefox to
  // reject the iframe before the preview session is established.
  if (!isPreview && !origins.length) return Object.freeze({ 'x-frame-options': 'SAMEORIGIN' });
  return Object.freeze({
    'content-security-policy': origins.length ? `frame-ancestors ${origins.join(' ')}` : "frame-ancestors 'none'"
  });
};

