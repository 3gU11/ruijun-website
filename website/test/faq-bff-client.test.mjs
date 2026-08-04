import assert from 'node:assert/strict';
import test from 'node:test';

const {
  buildFaqHandoffUrl,
  createFaqConversation,
  faqAssistantMode,
  requestFaqHandoff,
  streamFaqMessage,
  submitFaqFeedback
} = await import('../shared/faq-bff-client.mjs');

test('FAQ BFF is opt-in and static FAQ remains the default when no public BFF URL is configured', () => {
  assert.equal(faqAssistantMode(''), 'static');
  assert.equal(faqAssistantMode('not a url'), 'static');
  assert.equal(faqAssistantMode('https://ai.example.com/'), 'bff');
});

test('browser FAQ conversation calls the configured BFF directly with credentials', async () => {
  let request;
  const session = await createFaqConversation({
    baseUrl: 'https://ai.example.com/',
    fetchImpl: async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ faqSessionId: 'x'.repeat(43), restored: false, sourceChannel: 'website' }), { status: 201 });
    },
    context: { pageType: 'service', pageSlug: 'service' }
  });

  assert.equal(request.url, 'https://ai.example.com/api/faq/v1/conversations');
  assert.equal(request.init.credentials, 'include');
  assert.deepEqual(JSON.parse(request.init.body), { sourceChannel: 'website', context: { pageType: 'service', pageSlug: 'service' } });
  assert.equal(session.faqSessionId, 'x'.repeat(43));
});

test('repair handoff requires explicit consent and the navigation URL contains only the one-time token', async () => {
  await assert.rejects(
    () => requestFaqHandoff({ baseUrl: 'https://ai.example.com', fetchImpl: async () => new Response(), handoffType: 'repair_draft', faqSessionId: 'x'.repeat(43) }),
    (error) => error.code === 'FAQ_CONSENT_REQUIRED'
  );

  const target = buildFaqHandoffUrl('https://repair.example.com/repair/new?source=website', 'a'.repeat(43));
  const url = new URL(target);
  assert.equal(url.searchParams.get('faqHandoff'), 'a'.repeat(43));
  assert.equal(url.searchParams.get('source'), 'website');
  assert.equal(url.searchParams.has('symptomSummary'), false);
  assert.equal(url.searchParams.has('phone'), false);
});

test('FAQ BFF client exposes only normalized SSE events to the page, including knowledge citations', async () => {
  const events = [];
  await streamFaqMessage({
    baseUrl: 'https://ai.example.com',
    faqSessionId: 'x'.repeat(43),
    message: 'How do I prepare a repair request?',
    idempotencyKey: 'a'.repeat(32),
    fetchImpl: async () => new Response([
      'event: ack\ndata: {"requestId":"r"}\n\n',
      'event: citation\ndata: {"id":"knowledge-1","title":"Approved guide","version":"v1"}\n\n',
      'event: done\ndata: {"requestId":"r"}\n\n'
    ].join(''), { headers: { 'Content-Type': 'text/event-stream' } }),
    onEvent: (event) => events.push(event)
  });

  assert.deepEqual(events, [
    { event: 'ack', data: { requestId: 'r' } },
    { event: 'citation', data: { id: 'knowledge-1', title: 'Approved guide', version: 'v1' } },
    { event: 'done', data: { requestId: 'r' } }
  ]);
});

test('FAQ feedback posts only the normalized answer reference and feedback result to the BFF', async () => {
  let request;
  const result = await submitFaqFeedback({
    baseUrl: 'https://ai.example.com', faqSessionId: 'x'.repeat(43), requestId: 'r'.repeat(24), helpful: true,
    fetchImpl: async (url, init) => { request = { url, init }; return new Response(JSON.stringify({ accepted: true }), { status: 202 }); }
  });

  assert.equal(result.accepted, true);
  assert.equal(request.url, 'https://ai.example.com/api/faq/v1/feedback');
  assert.equal(request.init.credentials, 'include');
  assert.deepEqual(JSON.parse(request.init.body), {
    faqSessionId: 'x'.repeat(43), requestId: 'r'.repeat(24), helpful: true, reason: '', escalateToHuman: false
  });
});
