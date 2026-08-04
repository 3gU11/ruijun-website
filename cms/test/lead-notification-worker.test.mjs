import assert from 'node:assert/strict';
import test from 'node:test';

const { createLeadNotificationWorker } = await import('../notifications/lead-notification-worker.mjs');

function directusResponse(data = {}) {
  return Response.json({ data });
}

test('notification worker delivers pending lead references then records a sent audit state', async () => {
  const calls = [];
  const notifications = [];
  const worker = createLeadNotificationWorker({
    baseUrl: 'https://cms.example.test', accessToken: 'server-only-token', notificationUrl: 'https://notify.example.test/new-lead',
    now: () => new Date('2026-07-31T08:00:00.000Z'), lockToken: (job) => `${job.id}-lock`,
    fetchImpl: async (url, options = {}) => {
      const call = { url: new URL(url), method: options.method || 'GET', body: options.body };
      calls.push(call);
      if (call.method === 'GET') return directusResponse([{ id: 'job-1', lead_reference: 'lead-ref-1', attempts: 0, delivery_channel: 'sales' }]);
      return directusResponse({ id: 'job-1' });
    },
    notificationFetchImpl: async (url, options = {}) => {
      notifications.push({ url, ...options });
      return new Response('', { status: 202 });
    }
  });

  assert.deepEqual(await worker.runOnce(), { claimed: 1, delivered: 1, retrying: 0, manualReview: 0, skipped: 0 });
  assert.deepEqual(JSON.parse(notifications[0].body), { leadReference: 'lead-ref-1', channel: 'sales' });
  const updates = calls.filter((call) => call.method === 'PATCH');
  assert.equal(updates[0].url.pathname, '/items/lead_notification_jobs/job-1');
  assert.deepEqual(JSON.parse(updates[0].body), { status: 'processing', lock_token: 'job-1-lock' });
  assert.deepEqual(JSON.parse(updates[1].body), {
    status: 'sent', attempts: 1, sent_at: '2026-07-31T08:00:00.000Z', next_attempt_at: null, last_error: null, lock_token: 'job-1-lock'
  });
});

test('notification worker schedules retry and eventually marks exhausted jobs for manual review', async () => {
  const updates = [];
  const worker = createLeadNotificationWorker({
    baseUrl: 'https://cms.example.test', accessToken: 'server-only-token', notificationUrl: 'https://notify.example.test/new-lead',
    maxAttempts: 2, now: () => new Date('2026-07-31T08:00:00.000Z'), lockToken: (job) => `${job.id}-lock`,
    fetchImpl: async (url, options = {}) => {
      if ((options.method || 'GET') === 'GET') return directusResponse([
        { id: 'retry-job', lead_reference: 'lead-ref-2', attempts: 0, delivery_channel: 'sales' },
        { id: 'manual-job', lead_reference: 'lead-ref-3', attempts: 1, delivery_channel: 'sales' }
      ]);
      updates.push(JSON.parse(options.body));
      return directusResponse({});
    },
    notificationFetchImpl: async () => new Response('upstream unavailable', { status: 503 })
  });

  assert.deepEqual(await worker.runOnce(), { claimed: 2, delivered: 0, retrying: 1, manualReview: 1, skipped: 0 });
  assert.deepEqual(updates, [
    { status: 'processing', lock_token: 'retry-job-lock' },
    { status: 'retrying', attempts: 1, next_attempt_at: '2026-07-31T08:05:00.000Z', last_error: 'Notification endpoint responded 503', lock_token: 'retry-job-lock' },
    { status: 'processing', lock_token: 'manual-job-lock' },
    { status: 'manual_review', attempts: 2, next_attempt_at: null, last_error: 'Notification endpoint responded 503', lock_token: 'manual-job-lock' }
  ]);
});

test('notification worker skips jobs that are not due and jobs another worker has already claimed', async () => {
  const notifications = [];
  const worker = createLeadNotificationWorker({
    baseUrl: 'https://cms.example.test', accessToken: 'server-only-token', notificationUrl: 'https://notify.example.test/new-lead',
    now: () => new Date('2026-07-31T08:00:00.000Z'), lockToken: (job) => `${job.id}-lock`,
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET' };
      if (request.method === 'GET') return directusResponse([
        { id: 'later', lead_reference: 'lead-later', attempts: 0, delivery_channel: 'sales', next_attempt_at: '2026-07-31T08:01:00.000Z' },
        { id: 'claimed', lead_reference: 'lead-claimed', attempts: 0, delivery_channel: 'sales' }
      ]);
      if (request.url.pathname.endsWith('/claimed')) return new Response(JSON.stringify({ errors: [{ message: 'Already claimed' }] }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      return directusResponse({});
    },
    notificationFetchImpl: async () => {
      notifications.push('sent');
      return new Response('', { status: 202 });
    }
  });

  assert.deepEqual(await worker.runOnce(), { claimed: 0, delivered: 0, retrying: 0, manualReview: 0, skipped: 2 });
  assert.deepEqual(notifications, []);
});
