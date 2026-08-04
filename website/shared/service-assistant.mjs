const allowedActions = new Set(['support', 'request', 'warranty', 'requests']);

export function shouldEnableServiceEntries(available) {
  return available === true;
}

export function resolveServiceEntry(entries, action) {
  if (!allowedActions.has(action) || !entries || typeof entries[action] !== 'string') return null;
  try { const url = new URL(entries[action]); return /^https?:$/.test(url.protocol) ? url.toString() : null; } catch { return null; }
}
