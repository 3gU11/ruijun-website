export const FAQ_SESSION_STORAGE_KEY = 'ruijun_faq_session_v1';

const SAFE_SESSION_ID = /^[A-Za-z0-9_-]{20,80}$/;

function usableStorage(storage) {
  return storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function' && typeof storage.removeItem === 'function';
}

export function readFaqSessionId(storage) {
  if (!usableStorage(storage)) return '';
  const sessionId = String(storage.getItem(FAQ_SESSION_STORAGE_KEY) || '').trim();
  if (SAFE_SESSION_ID.test(sessionId)) return sessionId;
  storage.removeItem(FAQ_SESSION_STORAGE_KEY);
  return '';
}

export function writeFaqSessionId(storage, value) {
  if (!usableStorage(storage)) return '';
  const sessionId = String(value || '').trim();
  if (!SAFE_SESSION_ID.test(sessionId)) {
    storage.removeItem(FAQ_SESSION_STORAGE_KEY);
    return '';
  }
  storage.setItem(FAQ_SESSION_STORAGE_KEY, sessionId);
  return sessionId;
}
