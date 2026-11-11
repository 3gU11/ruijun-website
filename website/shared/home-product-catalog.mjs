import { mergeSeriesWithPreview } from './product-catalog-preview.mjs';

function normalizedProductKey(value) {
  return String(value || '').trim().toLowerCase();
}

function fallbackForRecord(record, index, fallbackProducts) {
  const fallbacks = Array.isArray(fallbackProducts) ? fallbackProducts : [];
  const recordKeys = new Set([
    normalizedProductKey(record?.slug),
    normalizedProductKey(record?.series_code)
  ].filter(Boolean));
  const matched = fallbacks.find((fallback) => recordKeys.has(normalizedProductKey(fallback?.id)));
  // Identity only: an unknown/new series must not inherit the image of the card
  // at its position. FR-G used to show the FR-Y photo because of the index
  // fallback. A missing cover now renders the neutral placeholder instead.
  void index;
  return matched || {};
}

function productFromRecord(record, index, fallbackProducts) {
  const fallback = fallbackForRecord(record, index, fallbackProducts);
  const image = String(record?.cover_asset || '').trim() || fallback.image || '/assets/psd/product-cover-placeholder.png';
  return {
    id: record?.slug || record?.series_code || `product-${index + 1}`,
    name: record?.name || '未命名产品',
    series: record?.positioning || record?.series_code || '产品系列',
    image,
    // A real series keeps an editable cover slot even while displaying its fallback image.
    imageFieldPath: record?.id != null ? 'cover_asset' : '',
    cmsBinding: { collection: 'product_series', itemId: String(record?.id || '') }
  };
}

/**
 * Resolve the homepage catalog from the public snapshot plus the protected
 * preview session. The published list owns the card count; preview records only
 * override matching series, so the canvas shows the same number of cards (and
 * the same cards) as the public homepage. The static catalog remains an
 * unbound last-resort fallback when nothing is published or previewed.
 */
export function resolveHomepageProducts(publishedRecords, previewRecords, fallbackProducts) {
  const { records } = mergeSeriesWithPreview(publishedRecords, previewRecords);
  if (!records.length) {
    return (Array.isArray(fallbackProducts) ? fallbackProducts : []).map((product) => ({
      ...product,
      cmsBinding: { collection: '', itemId: '' }
    }));
  }
  return records.slice(0, 6).map((record, index) => productFromRecord(record, index, fallbackProducts || []));
}
