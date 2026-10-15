// Catalogue of site data a dynamic block may reference.
//
// Only keys listed here can be chosen, and each entry owns its endpoint plus the
// field candidates used to map a record onto a card. Keeping this in one place
// means a new source is a one-line addition, and a block can never be pointed at
// an arbitrary URL.
//
// Field names differ between readers (a series has `name`/`positioning`, an
// article has `title`/`summary`), so mapping probes a short candidate list
// instead of hard-coding one schema.

const titleCandidates = Object.freeze(['title', 'name', 'label']);
const bodyCandidates = Object.freeze(['summary', 'positioning', 'description', 'body']);
const imageCandidates = Object.freeze(['cover', 'image', 'cover_asset', 'path']);
const hrefCandidates = Object.freeze(['href', 'url', 'link']);

export const dataListSources = Object.freeze({
  product_series: Object.freeze({
    key: 'product_series',
    label: '产品系列',
    endpoint: '/api/public/v1/product-series',
    hrefPrefix: '/product/',
    slugField: 'slug'
  }),
  articles: Object.freeze({
    key: 'articles',
    label: '新闻文章',
    endpoint: '/api/public/v1/articles',
    hrefPrefix: '/news/',
    slugField: 'slug'
  }),
  qualifications: Object.freeze({
    key: 'qualifications',
    label: '资质证书',
    endpoint: '/api/public/v1/qualifications',
    hrefPrefix: '',
    slugField: 'source_key'
  })
});

export const dataListSourceKeys = Object.freeze(Object.keys(dataListSources));

// Display labels for the registry's select field, so the workbench renders
// human names without needing to know about this catalogue.
export const dataListSourceLabels = Object.freeze(Object.fromEntries(
  Object.values(dataListSources).map((source) => [source.key, source.label])
));

export function getDataListSource(key) {
  return dataListSources[String(key || '').trim()] || null;
}

function pick(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

// Maps raw reader records onto the card shape the renderer consumes. Records
// that cannot yield a title are dropped rather than rendering an empty card.
// The limit applies after dropping, so "show 3" always means three cards.
export function resolveDataListItems(sourceKey, records, limit) {
  const source = getDataListSource(sourceKey);
  if (!source || !Array.isArray(records)) return [];
  const max = Number.isInteger(limit) ? Math.max(0, limit) : 3;
  return records.slice(0, 200).flatMap((record) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return [];
    const title = pick(record, titleCandidates);
    if (!title) return [];
    const slug = pick(record, [source.slugField]);
    const href = pick(record, hrefCandidates) || (source.hrefPrefix && slug ? `${source.hrefPrefix}${slug}` : '');
    return [{
      title,
      body: pick(record, bodyCandidates),
      image: pick(record, imageCandidates),
      href
    }];
  }).slice(0, max);
}
