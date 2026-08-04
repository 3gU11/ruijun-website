import assert from 'node:assert/strict';
import test from 'node:test';

const { FAQ_SESSION_STORAGE_KEY, readFaqSessionId, writeFaqSessionId } = await import('../shared/faq-session-store.mjs');

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values
  };
}

test('FAQ session store keeps only a valid opaque BFF session ID for the current browser session', () => {
  const storage = memoryStorage();
  const sessionId = 'a'.repeat(43);

  assert.equal(writeFaqSessionId(storage, sessionId), sessionId);
  assert.equal(storage.getItem(FAQ_SESSION_STORAGE_KEY), sessionId);
  assert.equal(readFaqSessionId(storage), sessionId);
  assert.equal(storage.values.size, 1);
});

test('FAQ session store rejects malformed values and clears stale data without storing a question or draft', () => {
  const storage = memoryStorage();
  storage.setItem(FAQ_SESSION_STORAGE_KEY, JSON.stringify({ faqSessionId: 'a'.repeat(43), message: 'fault details' }));

  assert.equal(readFaqSessionId(storage), '');
  assert.equal(storage.getItem(FAQ_SESSION_STORAGE_KEY), null);
  assert.equal(writeFaqSessionId(storage, 'short'), '');
  assert.equal(storage.values.size, 0);
});
