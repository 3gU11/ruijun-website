import assert from 'node:assert/strict';
import test from 'node:test';
import { redeemFaqHandoff } from '../server/faq-handoff-client.js';

const token = 'handoff_token_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456';

test('redeems a handoff through the FastAPI internal route only', async () => {
  let received;
  const payload = await redeemFaqHandoff({
    baseUrl: 'http://127.0.0.1:3201/',
    internalKey: 'internal-test-key',
    token,
    fetchImpl: async (url, options) => {
      received = { url, options };
      return new Response(JSON.stringify({ faqSessionId: 'faq_session_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456' }), { status: 200 });
    }
  });

  assert.equal(received.url, `http://127.0.0.1:3201/api/internal/v1/faq-handoffs/${token}/redeem`);
  assert.deepEqual(received.options.headers, { 'X-FAQ-Internal-Key': 'internal-test-key', Accept: 'application/json' });
  assert.equal(received.options.method, 'POST');
  assert.equal(payload.faqSessionId, 'faq_session_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456');
});

test('maps expired and unavailable internal handoffs to safe repair-portal errors', async () => {
  await assert.rejects(
    () => redeemFaqHandoff({ baseUrl: 'http://127.0.0.1:3201', internalKey: 'internal-test-key', token, fetchImpl: async () => new Response('', { status: 410 }) }),
    { status: 410 }
  );
  await assert.rejects(
    () => redeemFaqHandoff({ baseUrl: 'http://127.0.0.1:3201', internalKey: 'internal-test-key', token, fetchImpl: async () => { throw new Error('offline'); } }),
    { status: 503 }
  );
});
