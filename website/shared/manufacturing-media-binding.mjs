function isManagedMediaEntry(entry) {
  return Boolean(entry && typeof entry === 'object' && (
    entry.managed === true || entry.media_asset_id != null || entry.file_id
  ));
}

export function createManufacturingMediaBinding({ collection, itemId, index, entry, role } = {}) {
  const normalizedCollection = typeof collection === 'string' ? collection.trim() : '';
  const normalizedItemId = itemId == null ? '' : String(itemId).trim();
  const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : '';
  if (!normalizedCollection || !normalizedItemId || !Number.isInteger(index) || index < 0) return null;
  if (!isManagedMediaEntry(entry) && !normalizedRole) return null;
  return {
    collection: normalizedCollection,
    itemId: normalizedItemId,
    fieldPath: `media.${index}`,
    mediaRole: entry?.mediaType === 'video' ? 'video' : 'image',
    ...(normalizedRole ? { mediaSlot: normalizedRole } : {})
  };
}

export { isManagedMediaEntry };
