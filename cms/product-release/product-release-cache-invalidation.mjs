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

export async function invalidateProductReleaseCache({
  endpoint,
  secret,
  release,
  fetchImpl = fetch,
  timeoutMs = 5_000
} = {}) {
  if (!endpoint || !secret) {
    return { status: 'not_configured', attempted: false, error: 'CACHE_INVALIDATION_NOT_CONFIGURED' };
  }

  const url = normalizedEndpoint(endpoint);
  if (!url) {
    return { status: 'failed', attempted: false, error: 'CACHE_INVALIDATION_CONFIGURATION_INVALID' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), normalizedTimeout(timeoutMs));
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        collection: 'product_release_snapshots',
        releaseId: release?.id ?? null,
        version: Number(release?.version || 0),
        sourceHash: String(release?.source_hash || '')
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      return { status: 'failed', attempted: true, error: `CACHE_INVALIDATION_HTTP_${response.status}` };
    }
    return { status: 'succeeded', attempted: true, error: null };
  } catch (error) {
    return {
      status: 'failed',
      attempted: true,
      error: error?.name === 'AbortError' ? 'CACHE_INVALIDATION_TIMEOUT' : 'CACHE_INVALIDATION_REQUEST_FAILED'
    };
  } finally {
    clearTimeout(timeout);
  }
}
