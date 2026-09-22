const DEFAULT_HISTORY_LIMIT = 100;

export function cloneVisualSnapshot(value) {
  try {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

function fingerprint(value) {
  try { return JSON.stringify(value); } catch { return ''; }
}

export function createVisualHistory(snapshot) {
  const cloned = cloneVisualSnapshot(snapshot);
  return cloned == null ? { entries: [], index: -1 } : { entries: [cloned], index: 0 };
}

export function recordVisualSnapshot(history, snapshot, limit = DEFAULT_HISTORY_LIMIT) {
  const cloned = cloneVisualSnapshot(snapshot);
  if (cloned == null) return history;
  const entries = Array.isArray(history?.entries) ? history.entries : [];
  const index = Number.isInteger(history?.index) ? history.index : -1;
  if (fingerprint(entries[index]) === fingerprint(cloned)) return history;
  const boundedLimit = Math.max(2, Math.min(500, Number(limit) || DEFAULT_HISTORY_LIMIT));
  const nextEntries = [...entries.slice(0, index + 1), cloned].slice(-boundedLimit);
  return { entries: nextEntries, index: nextEntries.length - 1 };
}

export function stepVisualHistory(history, direction) {
  const entries = Array.isArray(history?.entries) ? history.entries : [];
  const index = Number.isInteger(history?.index) ? history.index : -1;
  const delta = direction < 0 ? -1 : direction > 0 ? 1 : 0;
  const nextIndex = index + delta;
  if (!delta || nextIndex < 0 || nextIndex >= entries.length) return null;
  return {
    history: { entries, index: nextIndex },
    state: cloneVisualSnapshot(entries[nextIndex])
  };
}
