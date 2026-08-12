import { appendResponseHeader, createError, getRequestHeader, setResponseStatus } from 'h3';
import { useRuntimeConfig } from '#imports';

const forwardHeaders = ['set-cookie'];

export async function repairApi(event, path, options = {}) {
  const config = useRuntimeConfig(event);
  const baseUrl = String(config.repairsysApiUrl || '').replace(/\/$/, '');
  if (!baseUrl) throw createError({ statusCode: 503, statusMessage: 'Repair service is unavailable' });
  const cookie = getRequestHeader(event, 'cookie');
  const origin = getRequestHeader(event, 'origin');
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...(origin ? { Origin: origin } : {})
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      signal: AbortSignal.timeout(8_000)
    });
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Repair service is unavailable' });
  }
  for (const name of forwardHeaders) {
    const values = typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : response.headers.get(name) ? [response.headers.get(name)] : [];
    values.filter(Boolean).forEach((value) => appendResponseHeader(event, name, value));
  }
  if (response.status === 204) {
    setResponseStatus(event, 204);
    return null;
  }
  if (response.status !== 200) setResponseStatus(event, response.status);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    setResponseStatus(event, response.status);
    return { code: 'REPAIR_API_ERROR', message: String(payload?.message || '售后服务暂时不可用') };
  }
  return payload;
}
