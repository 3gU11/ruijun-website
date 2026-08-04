import { createError, getHeader, readBody } from 'h3';
import { CmsCacheInvalidationUnauthorized, createCmsCacheInvalidator } from '../../../../services/cms-cache-invalidator.mjs';
import { getCmsPublicCacheClearers } from '../../../../services/cms-public-cache-registry.mjs';

export default defineEventHandler(async (event) => {
  const secret = String(useRuntimeConfig(event).cmsWebhookSecret || '');
  if (!secret) throw createError({ statusCode: 404, statusMessage: 'Not Found' });
  try {
    const body = await readBody(event) || {};
    return createCmsCacheInvalidator({ secret, clearers: getCmsPublicCacheClearers() }).invalidate({
      authorization: getHeader(event, 'authorization'),
      collection: body.collection
    });
  } catch (error) {
    if (error instanceof CmsCacheInvalidationUnauthorized) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    if (error instanceof TypeError) throw createError({ statusCode: 400, statusMessage: 'Invalid CMS cache invalidation request' });
    throw error;
  }
});
