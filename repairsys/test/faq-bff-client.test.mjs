import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createFaqConversation,
  faqAssistantMode,
  streamFaqMessage,
  submitFaqFeedback
} from '../src/faq-bff-client.js';

const sessionId = 'faq_session_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456';

test('uses the static fallback unless a valid public BFF URL is configured', () => {
  assert.equal(faqAssistantMode(''), 'static');
  assert.equal(faqAssistantMode('javascript:alert(1)'), 'static');
  assert.equal(faqAssistantMode('https://ai.example.com/'), 'bff');
});

test('creates a repair-portal conversation with browser cookies and an approved restored session', async () => {
  let received;
  const result = await createFaqConversation({
    baseUrl: 'https://ai.example.com/',
    faqSessionId: sessionId,
    context: { page: 'support' },
    fetchImpl: async (url, options) => {
      received = { url, options };
      return new Response(JSON.stringify({ faqSessionId: sessionId, resumed: true }), { status: 200 });
    }
  });

  assert.deepEqual(result, { faqSessionId: sessionId, resumed: true });
  assert.equal(received.url, 'https://ai.example.com/api/faq/v1/conversations');
  assert.equal(received.options.credentials, 'include');
  assert.deepEqual(JSON.parse(received.options.body), {
    sourceChannel: 'repair_portal', context: { page: 'support' }, faqSessionId: sessionId
  });
});

test('normalizes BFF SSE events and submits feedback with browser cookies', async () => {
  const events = [];
  const frames = [
    'event: ack\ndata: {"requestId":"request_12345678"}\n\n',
    'event: delta\ndata: {"text":"Check the machine"}\n\n',
    'event: citation\ndata: {"title":"Safety guide","version":"v3"}\n\n',
    'event: done\ndata: {"answer":"Check the machine"}\n\n'
  ];
  let messageRequest;
  await streamFaqMessage({
    baseUrl: 'https://ai.example.com',
    faqSessionId: sessionId,
    message: 'How should I inspect the guide wheel?',
    idempotencyKey: 'repair-faq-message-12345678',
    fetchImpl: async (url, options) => {
      messageRequest = { url, options };
      return new Response(new ReadableStream({
        start(controller) {
          for (const frame of frames) controller.enqueue(new TextEncoder().encode(frame));
          controller.close();
        }
      }), { status: 200 });
    },
    onEvent: (event) => events.push(event)
  });

  assert.equal(messageRequest.url, 'https://ai.example.com/api/faq/v1/messages');
  assert.equal(messageRequest.options.credentials, 'include');
  assert.equal(messageRequest.options.headers['Idempotency-Key'], 'repair-faq-message-12345678');
  assert.deepEqual(events.map(({ event, data }) => ({ event, data })), [
    { event: 'ack', data: { requestId: 'request_12345678' } },
    { event: 'delta', data: { text: 'Check the machine' } },
    { event: 'citation', data: { title: 'Safety guide', version: 'v3' } },
    { event: 'done', data: { answer: 'Check the machine' } }
  ]);

  let feedbackRequest;
  await submitFaqFeedback({
    baseUrl: 'https://ai.example.com',
    faqSessionId: sessionId,
    requestId: 'request_12345678',
    helpful: false,
    reason: 'needs technician',
    escalateToHuman: true,
    fetchImpl: async (url, options) => {
      feedbackRequest = { url, options };
      return new Response(JSON.stringify({ accepted: true }), { status: 200 });
    }
  });
  assert.equal(feedbackRequest.url, 'https://ai.example.com/api/faq/v1/feedback');
  assert.equal(feedbackRequest.options.credentials, 'include');
  assert.equal(JSON.parse(feedbackRequest.options.body).faqSessionId, sessionId);
});
