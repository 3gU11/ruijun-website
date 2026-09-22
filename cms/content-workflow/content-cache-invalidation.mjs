function normalizedEndpoint(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value));
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizedTimeout(value) {
  const timeout = Number(value);
  return Number.isFinite(timeout) ? Math.min(30_000, Math.max(250, timeout)) : 5_000;
}

export async function invalidateContentCache({ endpoint, secret, collection, keys = [], fetchImpl = fetch, timeoutMs } = {}) {
  const normalizedCollection = String(collection || '').trim();
  const normalizedKeys = Array.isArray(keys) ? keys.map((key) => String(key)).filter(Boolean).slice(0, 100) : [];
  if (!normalizedCollection || !endpoint || !secret) return { status: 'not_configured', attempted: false, error: 'CACHE_INVALIDATION_NOT_CONFIGURED' };
  const url = normalizedEndpoint(endpoint);
  if (!url) return { status: 'failed', attempted: false, error: 'CACHE_INVALIDATION_CONFIGURATION_INVALID' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), normalizedTimeout(timeoutMs));
  try {
    const response = await fetchImpl(url, {
      method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection: normalizedCollection, keys: normalizedKeys }), signal: controller.signal
    });
    return response.ok ? { status: 'succeeded', attempted: true, error: null } : { status: 'failed', attempted: true, error: `CACHE_INVALIDATION_HTTP_${response.status}` };
  } catch (error) {
    return { status: 'failed', attempted: true, error: error?.name === 'AbortError' ? 'CACHE_INVALIDATION_TIMEOUT' : 'CACHE_INVALIDATION_REQUEST_FAILED' };
  } finally {
    clearTimeout(timeout);
  }
}
