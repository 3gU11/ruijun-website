function sameProductSeries(left, right) {
  if (left?.id != null && right?.id != null) return String(left.id) === String(right.id);
  const keys = ['series_code', 'slug'];
  const comparable = keys.filter((key) => left?.[key] != null && right?.[key] != null);
  return comparable.length > 0 && comparable.every((key) => String(left[key]) === String(right[key]));
}

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
  return matched || fallbacks[index % Math.max(1, fallbacks.length)] || {};
}

function productFromRecord(record, index, fallbackProducts) {
  const fallback = fallbackForRecord(record, index, fallbackProducts);
  const image = String(record?.cover_asset || '').trim() || fallback.image || '';
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
 * preview session. Preview records must win even when the public endpoint is
 * empty, while the static catalog remains an unbound last-resort fallback.
 */
export function resolveHomepageProducts(publishedRecords, previewRecords, fallbackProducts) {
  const published = Array.isArray(publishedRecords) ? publishedRecords.filter(Boolean) : [];
  const previews = Array.isArray(previewRecords) ? previewRecords.filter(Boolean) : [];
  const merged = [...published];
  for (const preview of previews) {
    const index = merged.findIndex((record) => sameProductSeries(record, preview));
    if (index < 0) merged.unshift(preview);
    else merged[index] = { ...merged[index], ...preview };
  }
  if (!merged.length) {
    return (Array.isArray(fallbackProducts) ? fallbackProducts : []).map((product) => ({
      ...product,
      cmsBinding: { collection: '', itemId: '' }
    }));
  }
  return merged.slice(0, 6).map((record, index) => productFromRecord(record, index, fallbackProducts || []));
}
