// The CMS canvas renders the public product catalog with an authenticated draft
// overlay. A draft may change what an already published card says, but it must
// not change how many cards the page has: the card count, the positional numbers
// and the pager are decided by the public reader, and an unpublished series is
// not part of that list yet. Adding preview-only records made the canvas show
// one card and one extra page that the public site never had.
//
// The two lists are returned separately so the canvas can keep the exact public
// count while still telling the editor which draft series are hidden.

function normalizedKey(value) {
  return String(value ?? '').trim().toLowerCase();
}

function hasKey(record, key) {
  return record?.[key] != null && String(record[key]).trim() !== '';
}

export function sameProductSeries(left, right) {
  if (left?.id != null && right?.id != null) return String(left.id) === String(right.id);
  const keys = ['series_code', 'slug'];
  const comparable = keys.filter((key) => hasKey(left, key) && hasKey(right, key));
  return comparable.length > 0 && comparable.every((key) => normalizedKey(left[key]) === normalizedKey(right[key]));
}

/**
 * Merge the preview session into the published series list.
 *
 * - a preview record that matches a published series only overrides its fields;
 * - a preview record that has never been published is reported separately and
 *   does not enter the catalog, so count / numbering / pagination stay identical
 *   to the public page;
 * - when nothing is published yet the preview records ARE the catalog, otherwise
 *   the editor could not lay out the page before the first release;
 * - `includeDrafts` appends the unpublished records as extra cards. The canvas
 *   turns it on so a card created there is visible immediately, with the draft
 *   note explaining that the public site does not show it yet.
 */
export function mergeSeriesWithPreview(publishedRecords, previewRecords, { includeDrafts = false } = {}) {
  const published = (Array.isArray(publishedRecords) ? publishedRecords : []).filter((record) => record && typeof record === 'object');
  const previews = (Array.isArray(previewRecords) ? previewRecords : []).filter((record) => record && typeof record === 'object');
  const records = [...published];
  const unpublishedDrafts = [];
  for (const preview of previews) {
    const index = records.findIndex((record) => sameProductSeries(record, preview));
    if (index >= 0) {
      records[index] = { ...records[index], ...preview };
      continue;
    }
    if (!published.length) {
      records.push(preview);
      continue;
    }
    unpublishedDrafts.push(preview);
  }
  if (includeDrafts && unpublishedDrafts.length) records.push(...unpublishedDrafts);
  return { records, unpublishedDrafts };
}

export function productSeriesLabel(series) {
  return String(series?.name || series?.series_code || series?.slug || '').trim();
}

export function unpublishedSeriesSummary(unpublishedDrafts, limit = 4) {
  const names = (Array.isArray(unpublishedDrafts) ? unpublishedDrafts : [])
    .map(productSeriesLabel)
    .filter(Boolean);
  if (!names.length) return { count: 0, text: '' };
  const head = names.slice(0, limit).join('、');
  return {
    count: names.length,
    text: names.length > limit ? `${head} 等 ${names.length} 个系列` : head
  };
}
