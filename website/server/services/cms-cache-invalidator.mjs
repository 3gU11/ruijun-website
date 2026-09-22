import { timingSafeEqual } from 'node:crypto';

export class CmsCacheInvalidationUnauthorized extends Error {
  constructor() {
    super('CMS cache invalidation is unauthorized');
    this.name = 'CmsCacheInvalidationUnauthorized';
  }
}

const cacheByCollection = Object.freeze({
  pages: ['pages'],
  product_series: ['products'],
  product_models: ['products'],
  product_parameters: ['products'],
  product_release_snapshots: ['products'],
  articles: ['articles'],
  site_settings: ['navigation'],
  external_service_entries: ['serviceEntries'],
  service_resources: ['serviceContent'],
  knowledge_items: ['serviceContent'],
  service_locations: ['serviceContent'],
  milestones: ['evidence'],
  qualifications: ['evidence'],
  manufacturing_evidence: ['evidence'],
  media_assets: ['pages', 'products', 'evidence']
});

function validAuthorization(authorization, secret) {
  const value = String(authorization || '');
  const expected = `Bearer ${secret}`;
  const actualBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function createCmsCacheInvalidator({ secret, clearers }) {
  if (!secret) throw new TypeError('secret is required');
  const registered = Object.fromEntries(Object.entries(clearers || {}).filter(([, clear]) => typeof clear === 'function'));

  return {
    invalidate({ authorization, collection } = {}) {
      if (!validAuthorization(authorization, secret)) throw new CmsCacheInvalidationUnauthorized();
      const cacheNames = collection === undefined || collection === null || collection === ''
        ? Object.keys(registered)
        : cacheByCollection[String(collection)];
      if (!cacheNames) throw new TypeError('collection is not eligible for public cache invalidation');
      const invalidated = [...new Set(cacheNames)].filter((name) => registered[name]);
      for (const name of invalidated) registered[name]();
      return { invalidated };
    }
  };
}
