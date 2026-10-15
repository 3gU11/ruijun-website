import { Readable } from 'node:stream';
import { createError, getRequestHeader, getRouterParam, sendStream, setResponseHeader, setResponseStatus } from 'h3';

// Public stream for a CMS media asset binary.
//
// The page readers resolve an asset to this path, and the browser fetches it
// same-origin. Directus itself must not serve these bytes: the public policy has
// no `directus_files` read permission (only the editor policy has one, scoped to
// their own uploads), so a Directus-origin asset URL answers 403 with a JSON
// body — which the browser then refuses with ERR_BLOCKED_BY_ORB, because a
// cross-origin no-cors media load silently aborts on a non-media response.
//
// Governance is preserved by re-checking the published state here: a URL only
// exists for an asset the readers already accepted, so an unpublished or
// non-approved asset gets the same non-revealing 404 as any other missing id.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default defineEventHandler(async (event) => {
  const fileId = String(getRouterParam(event, 'fileId') || '').trim();
  if (!UUID_PATTERN.test(fileId)) throw createError({ statusCode: 404, statusMessage: '素材不存在' });

  const config = useRuntimeConfig(event);
  const endpoint = String(config.cmsMediaAssetsUrl || '').trim();
  const token = String(config.cmsBffToken || '').trim();
  if (!endpoint || !token) throw createError({ statusCode: 503, statusMessage: '素材服务尚未配置' });

  let record = null;
  try {
    const url = new URL(endpoint);
    url.searchParams.set('filter[file_id][_eq]', fileId);
    url.searchParams.set('filter[status][_eq]', 'published');
    url.searchParams.set('filter[publication_state][_eq]', 'published');
    url.searchParams.set('filter[enabled][_eq]', 'true');
    url.searchParams.set('fields', 'id,file_id,mime_type,enabled,status,publication_state');
    url.searchParams.set('limit', '1');
    const metadata = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    const body = metadata.ok ? await metadata.json() : null;
    const match = Array.isArray(body?.data) ? body.data.find((candidate) => String(candidate?.file_id || '') === fileId) : null;
    record = match && match.enabled !== false && match.status === 'published' && match.publication_state === 'published' ? match : null;
  } catch { /* converted to the same non-revealing response below */ }
  if (!record) throw createError({ statusCode: 404, statusMessage: '素材不存在' });

  const cmsOrigin = new URL(endpoint).origin;
  const range = String(getRequestHeader(event, 'range') || '').trim();
  const upstream = await fetch(`${cmsOrigin}/assets/${encodeURIComponent(fileId)}`, {
    headers: { Authorization: `Bearer ${token}`, ...(range ? { Range: range } : {}) },
  });
  if (!upstream.body) throw createError({ statusCode: 502, statusMessage: '素材暂时不可用' });
  // A client error from upstream (an unsatisfiable range, for instance) is the
  // caller's own doing and must be reported as such. Folding it into a 502 would
  // pin the blame on this service while the site was actually healthy.
  if (!upstream.ok && upstream.status >= 400 && upstream.status < 500) {
    throw createError({ statusCode: upstream.status, statusMessage: '请求的字节范围无法满足' });
  }
  if (!upstream.ok) throw createError({ statusCode: 502, statusMessage: '素材暂时不可用' });

  // Range must survive the hop. Without it the browser can only fetch whole
  // files, so a video seek pulls the entire asset and the initial probe aborts
  // and retries — the browser is left negotiating for bytes it cannot get.
  const upstreamRange = upstream.headers.get('content-range');
  const upstreamLength = upstream.headers.get('content-length');
  if (upstreamRange) setResponseHeader(event, 'content-range', upstreamRange);
  setResponseHeader(event, 'accept-ranges', upstream.headers.get('accept-ranges') || 'bytes');
  if (upstreamLength) setResponseHeader(event, 'content-length', upstreamLength);

  setResponseHeader(event, 'cache-control', 'public, max-age=300, s-maxage=600');
  setResponseHeader(event, 'content-type', upstream.headers.get('content-type') || String(record.mime_type || 'application/octet-stream'));
  if (upstream.status === 206) setResponseStatus(event, 206);
  return sendStream(event, Readable.fromWeb(upstream.body as never));
});
