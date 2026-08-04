import assert from 'node:assert/strict';
import test from 'node:test';
import { requestFaqFallback } from '../server/faq-fallback.js';

test('forwards an approved FAQ question to the configured upstream without browser data', async () => {
  let received;
  const result = await requestFaqFallback({
    question: 'How do I check warranty status?',
    upstreamUrl: 'http://faq.internal/answer',
    fetchImpl: async (url, options) => {
      received = { url, options };
      return new Response(JSON.stringify({ matched: true, title: 'Warranty', steps: ['Find model'], suggestedAction: 'warranty' }), { status: 200 });
    }
  });

  assert.deepEqual(received, {
    url: 'http://faq.internal/answer',
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ question: 'How do I check warranty status?', entry: 'support' }),
      signal: received.options.signal
    }
  });
  assert.equal(result.title, 'Warranty');
  assert.equal(result.suggestedAction, 'warranty');
});

test('rejects empty and oversized FAQ questions before requesting the upstream', async () => {
  let calls = 0;
  await assert.rejects(
    () => requestFaqFallback({ question: '', fetchImpl: async () => { calls += 1; } }),
    { code: 'INVALID_FAQ_QUESTION' }
  );
  await assert.rejects(
    () => requestFaqFallback({ question: 'x'.repeat(301), fetchImpl: async () => { calls += 1; } }),
    { code: 'INVALID_FAQ_QUESTION' }
  );
  assert.equal(calls, 0);
});

test('converts an upstream outage into a safe service-unavailable error', async () => {
  await assert.rejects(
    () => requestFaqFallback({ question: 'Need support', fetchImpl: async () => { throw new Error('network down'); } }),
    { code: 'FAQ_UNAVAILABLE', status: 503 }
  );
});
