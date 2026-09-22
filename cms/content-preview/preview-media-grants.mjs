import { randomBytes, createHash } from 'node:crypto';
import { normalizePreviewTarget } from './content-preview-token.mjs';

// Internal store only: callers must authorize the editor and validate the
// selected media placement before issuing a grant. Restart invalidates grants.
export function createPreviewMediaGrantStore({ now = Date.now, maxEntries = 1000 } = {}) {
  const entries = new Map();
  const hash = token => createHash('sha256').update(token).digest('hex');
  function issue({ collection, itemId, assetId }) {
    const target = normalizePreviewTarget(collection, itemId);
    if (!target || !/^(?:[1-9]\d*|[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})$/i.test(String(assetId || ''))) throw new TypeError('Invalid preview media target');
    const timestamp = now();
    for (const [key, value] of entries) if (value.expiresAt <= timestamp) entries.delete(key);
    while (entries.size >= Math.max(1, maxEntries)) entries.delete(entries.keys().next().value);
    const token = randomBytes(48).toString('base64url');
    entries.set(hash(token), { collection: target.contentCollection, itemId: target.contentItemId, assetId: String(assetId), expiresAt: timestamp + 60000 });
    return token;
  }
  function consume(token, { collection, itemId } = {}) {
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{64}$/.test(token)) return null;
    const key = hash(token);
    const entry = entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= now()) { entries.delete(key); return null; }
    if (entry.collection !== collection || entry.itemId !== String(itemId)) return null;
    entries.delete(key);
    return { collection: entry.collection, itemId: entry.itemId, assetId: entry.assetId };
  }
  return Object.freeze({ issue, consume });
}
