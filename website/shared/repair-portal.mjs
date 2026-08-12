const REPAIR_PORTAL_PATHS = Object.freeze({
  repair_new: '/repair/new',
  repair_warranty: '/warranty',
  repair_requests: '/requests'
});

export function resolveRepairPortalUrl(action, baseUrl, params = {}) {
  const path = REPAIR_PORTAL_PATHS[String(action || '')];
  if (!path || !String(baseUrl || '').trim()) return null;
  let base;
  try { base = new URL(String(baseUrl)); } catch { return null; }
  base.hash = '';
  base.search = '';
  base.pathname = `${base.pathname.replace(/\/$/, '')}${path}`;
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim()) base.searchParams.set(key, String(value).trim());
  }
  return base.toString();
}

export { REPAIR_PORTAL_PATHS };
