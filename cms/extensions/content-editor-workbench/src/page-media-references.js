export function normalizePageMediaReferences(value) {
  const seen = new Set();
  return (Array.isArray(value) ? value : []).flatMap(entry => {
    const id = typeof entry?.media_asset_id === 'string' || Number.isSafeInteger(entry?.media_asset_id)
      ? String(entry.media_asset_id).trim() : '';
    const role = typeof entry?.role === 'string' ? entry.role.trim().slice(0, 60) : '';
    const key = JSON.stringify([id, role]);
    if (!id || seen.has(key)) return [];
    seen.add(key);
    return [{media_asset_id:id, role}];
  });
}
