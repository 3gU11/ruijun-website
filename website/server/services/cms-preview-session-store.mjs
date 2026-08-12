import { randomBytes } from 'node:crypto';

export const CMS_PREVIEW_SESSION_COOKIE = 'ruijun_preview_session';
export const CMS_PREVIEW_SESSION_TTL_MS = 15 * 60 * 1000;

function validSessionId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{32,160}$/.test(value.trim()) ? value.trim() : null;
}

export function createCmsPreviewSessionStore({ now = () => Date.now(), ttlMs = CMS_PREVIEW_SESSION_TTL_MS, random = randomBytes, maxSessions = 1000 } = {}) {
  const sessions = new Map();

  function prune(timestamp = now()) {
    for (const [id, session] of sessions) {
      if (session.expiresAt <= timestamp) sessions.delete(id);
    }
    while (sessions.size >= maxSessions) {
      const oldest = sessions.keys().next().value;
      if (oldest === undefined) break;
      sessions.delete(oldest);
    }
  }

  function create(data) {
    const timestamp = now();
    prune(timestamp);
    const id = random(48).toString('base64url');
    const expiresAt = timestamp + ttlMs;
    sessions.set(id, { data, expiresAt });
    return { id, expiresAt: new Date(expiresAt).toISOString() };
  }

  function get(value) {
    const id = validSessionId(value);
    if (!id) return null;
    const session = sessions.get(id);
    if (!session) return null;
    if (session.expiresAt <= now()) {
      sessions.delete(id);
      return null;
    }
    return { data: session.data, expiresAt: new Date(session.expiresAt).toISOString() };
  }

  function revoke(value) {
    const id = validSessionId(value);
    return id ? sessions.delete(id) : false;
  }

  return Object.freeze({ create, get, revoke, size: () => sessions.size });
}

const storeKey = Symbol.for('ruijun.website.cms-preview-session-store');

export function useCmsPreviewSessionStore(options) {
  if (!globalThis[storeKey]) globalThis[storeKey] = createCmsPreviewSessionStore(options);
  return globalThis[storeKey];
}

