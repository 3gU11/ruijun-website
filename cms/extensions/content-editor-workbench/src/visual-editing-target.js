const supportedCollections = new Set([
  'pages', 'product_series', 'product_models', 'product_parameters', 'articles', 'case_studies',
  'milestones', 'qualifications', 'manufacturing_evidence', 'service_resources',
  'service_locations', 'external_service_entries', 'repair_page_configs', 'site_settings'
]);

// Forms edit a detached draft while record lists retain their load snapshot.
// Prefer the active draft for a matching id so canvas edits participate in
// preview, dirty-state detection, and the save handler.
export function preferVisualDraftRecord(records, draft) {
  const source = Array.isArray(records) ? records : [];
  const id = String(draft?.id ?? '').trim();
  if (!id) return source;
  return [draft, ...source.filter((record) => String(record?.id ?? '').trim() !== id)];
}

function recordsFor(state, collection) {
  if (collection === 'pages') return state.pages;
  if (collection === 'product_series') return state.series;
  if (collection === 'product_models') return state.models;
  if (collection === 'product_parameters') return state.parameters;
  if (collection === 'articles' || collection === 'case_studies') return state.editorial?.[collection];
  if (['milestones', 'qualifications', 'manufacturing_evidence'].includes(collection)) return state.company?.[collection];
  if (['service_resources', 'service_locations', 'external_service_entries'].includes(collection)) return state.service?.[collection];
  if (collection === 'repair_page_configs') return state.repairPages;
  if (collection === 'site_settings') return state.settings ? [state.settings] : [];
  return null;
}

export function resolveVisualEditingRecord(state, selection = {}) {
  const collection = String(selection.collection || '').trim();
  const itemId = String(selection.itemId || '').trim();
  if (!supportedCollections.has(collection) || !/^[A-Za-z0-9_-]{1,128}$/.test(itemId)) return null;
  if (selection.fieldPath != null && String(selection.fieldPath).trim()) {
    const fieldPath = String(selection.fieldPath).trim();
    if (!/^[A-Za-z0-9_-]+(?:\.(?:[A-Za-z0-9_-]+|\d+))*$/.test(fieldPath) || fieldPath.split('.').some((part) => ['__proto__', 'prototype', 'constructor'].includes(part))) return null;
  }
  const records = recordsFor(state || {}, collection);
  if (!Array.isArray(records)) return null;
  const record = records.find((item) => String(item?.id || '') === itemId);
  return record ? { collection, record } : null;
}

// A canvas selection can resolve through the loaded record list while the
// editor is already holding a normalized, unsaved draft for that same item.
// Prefer that active draft only when the collection and id both match.
export function resolveActiveVisualEditingTarget(activeTarget, resolvedTarget, selection = {}) {
  const collection = String(selection.collection || '').trim();
  const itemId = String(selection.itemId || '').trim();
  if (
    activeTarget?.record
    && collection
    && itemId
    && collection === String(activeTarget.collection || '').trim()
    && itemId === String(activeTarget.record.id || '').trim()
  ) {
    return { collection, record: activeTarget.record };
  }
  return resolvedTarget || null;
}
