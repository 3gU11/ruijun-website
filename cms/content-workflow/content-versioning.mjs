const systemFields = new Set(['id', 'date_created', 'date_updated', 'user_created', 'user_updated', 'publication_log']);

function text(value, maximum = 500) {
  return typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, maximum) : '';
}

function asObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function activityLog(value) {
  let entries = value;
  if (typeof value === 'string') {
    try {
      entries = JSON.parse(value);
    } catch {
      entries = [];
    }
  }
  return Array.isArray(entries) ? entries.filter((entry) => entry && typeof entry === 'object').slice(-199) : [];
}

export function contentSnapshot(record) {
  return Object.fromEntries(Object.entries(asObject(record)).filter(([key]) => !systemFields.has(key)));
}

export function buildContentVersion({ collection, current, next, actorId, action, now = () => new Date() }) {
  const timestamp = now();
  if (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime())) throw new TypeError('now must return a valid Date');
  const before = contentSnapshot(current);
  // Directus item updates carry a patch, not a complete record.
  const after = { ...before, ...contentSnapshot(next) };
  const changed_fields = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])).sort();
  return {
    content_collection: text(collection, 128), content_item_id: text(String(current?.id || ''), 128),
    source_status: text(current?.status, 64), source_publication_state: text(current?.publication_state, 64), snapshot: before,
    changed_fields, action: text(action, 128), actor: text(actorId, 128), created_at: timestamp.toISOString()
  };
}

export function buildRestoredDraft({ snapshot, current, actorId, versionId, restoreNote, now = () => new Date() }) {
  const timestamp = now();
  if (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime())) throw new TypeError('now must return a valid Date');
  const note = text(restoreNote);
  if (!note) throw new TypeError('restoreNote is required');
  const source = contentSnapshot(snapshot);
  const audit = {
    action: 'restored_from_version', actor: text(actorId, 128), at: timestamp.toISOString(), version_id: text(String(versionId), 128), note
  };
  return {
    ...source, status: 'draft', publication_state: 'unpublished', published_at: null, review_note: note,
    publication_log: [...activityLog(current?.publication_log), audit]
  };
}
