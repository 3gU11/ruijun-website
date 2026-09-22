function targetIdentity(target = {}) {
  return {
    collection: String(target.collection || '').trim(),
    itemId: String(target.itemId ?? target.record?.id ?? '').trim()
  };
}

export function requiresVisualDraftSwitchConfirmation({ hasUnsavedChanges, currentTarget, nextTarget } = {}) {
  if (!hasUnsavedChanges) return false;
  const current = targetIdentity(currentTarget);
  const next = targetIdentity(nextTarget);
  if (!current.collection || !current.itemId || !next.collection || !next.itemId) return false;
  return current.collection !== next.collection || current.itemId !== next.itemId;
}
