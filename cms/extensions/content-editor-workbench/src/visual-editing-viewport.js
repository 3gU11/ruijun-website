const MOBILE_VIEWPORT_MAX = 720;

export function canEditVisualCanvas({ device = 'desktop', viewportWidth = Infinity } = {}) {
  const width = Number(viewportWidth);
  if (String(device) !== 'desktop') return false;
  if (Number.isFinite(width) && width <= MOBILE_VIEWPORT_MAX) return false;
  return true;
}

export { MOBILE_VIEWPORT_MAX };
