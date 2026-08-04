const allowedEntryTypes = new Set(['support', 'request', 'warranty', 'requests']);
const confirmationKey = 'ruijun.service-exit-confirmed';

export const SERVICE_EXIT_NOTICE = '即将进入瑞钧售后服务系统';

export function createServiceEntryClick(entryType, sourcePath) {
  const normalizedType = String(entryType || '').trim();
  const normalizedPath = String(sourcePath || '').trim();
  if (!allowedEntryTypes.has(normalizedType)) return null;
  if (!normalizedPath.startsWith('/') || normalizedPath.includes('?') || normalizedPath.includes('#') || normalizedPath.length > 120) return null;
  return { entryType: normalizedType, sourcePath: normalizedPath };
}

export function hasConfirmedServiceExit(storage) {
  try { return storage?.getItem(confirmationKey) === 'true'; } catch { return false; }
}

export function markServiceExitConfirmed(storage) {
  try { storage?.setItem(confirmationKey, 'true'); } catch { /* Session storage can be unavailable in private browser contexts. */ }
}
