import { createError, getRequestHeader, getRouterParam, setResponseHeader } from 'h3';
import { useRuntimeConfig } from '#imports';

const safeSegment = /^[A-Za-z0-9._-]{1,160}$/;

export default defineEventHandler(async (event) => {
  const requestNo = String(getRouterParam(event, 'requestNo') || '');
  const fileName = String(getRouterParam(event, 'fileName') || '');
  if (!safeSegment.test(requestNo) || !safeSegment.test(fileName) || fileName.includes('..')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid attachment path' });
  }
  const config = useRuntimeConfig(event);
  const baseUrl = String(config.repairsysApiUrl || '').replace(/\/$/, '');
  if (!baseUrl) throw createError({ statusCode: 503, statusMessage: 'Repair service is unavailable' });
  const uploadBaseUrl = String(config.repairsysPublicBaseUrl || baseUrl.replace(/\/api$/, '')).replace(/\/$/, '');
  let response;
  try {
    response = await fetch(`${uploadBaseUrl}/uploads/repair-requests/${encodeURIComponent(requestNo)}/${encodeURIComponent(fileName)}`, {
      headers: { ...(getRequestHeader(event, 'cookie') ? { Cookie: getRequestHeader(event, 'cookie') } : {}) },
      signal: AbortSignal.timeout(8_000)
    });
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Repair service is unavailable' });
  }
  if (!response.ok) throw createError({ statusCode: response.status, statusMessage: 'Attachment unavailable' });
  setResponseHeader(event, 'Content-Type', response.headers.get('content-type') || 'application/octet-stream');
  setResponseHeader(event, 'Cache-Control', 'private, no-store');
  return Buffer.from(await response.arrayBuffer());
});
