import assert from 'node:assert/strict';
import test from 'node:test';

const { createCmsLeadStore } = await import('../server/services/cms-lead-store.mjs');

test('Nuxt lead store uses a private HMAC dedupe key and queues sales notification after persistence', async () => {
  const requests = [];
  const store = createCmsLeadStore({
    endpoint: 'https://cms.example.test/items/leads', dedupeKeysEndpoint: 'https://cms.example.test/items/lead_dedupe_keys', notificationJobsEndpoint: 'https://cms.example.test/items/lead_notification_jobs', accessToken: 'server-only-token', dedupeSecret: 'test-only-dedupe-secret',
    fetchImpl: async (url, options) => {
      requests.push({ url: String(url), options });
      if ((options.method || 'GET') === 'GET') return Response.json({ data: [] });
      return Response.json({ data: { id: requests.length === 2 ? 'dedupe-1' : requests.length === 3 ? 'lead-1' : 'job-1' } });
    }
  });
  const lead = { leadReference: 'a1111111-1111-4111-8111-111111111111', name: '张工', phone: '13738375470', leadType: 'quote', requirement: '', pagePath: '/product/', source: 'official_site', consentAt: '2026-07-31T00:00:00.000Z' };

  assert.equal(await store.hasRecentPhone(lead.phone, '2026-07-30T00:00:00.000Z'), false);
  assert.deepEqual(await store.create(lead), { id: 'lead-1', status: 'new', notificationQueued: true });
  assert.ok(requests[0].url.includes('/lead_dedupe_keys'));
  assert.ok(!requests[0].url.includes(lead.phone));
  assert.equal(requests[1].options.headers.Authorization, 'Bearer server-only-token');
  assert.match(JSON.parse(requests[1].options.body).key_hash, /^[a-f0-9]{64}$/);
  assert.equal(JSON.parse(requests[2].options.body).lead_reference, lead.leadReference);
  assert.equal(JSON.parse(requests[3].options.body).status, 'pending');
});

test('Nuxt lead store checks dedupe records using only the BFF-authorized hash field', async () => {
  let requestedUrl = '';
  const store = createCmsLeadStore({
    endpoint: 'https://cms.example.test/items/leads',
    dedupeKeysEndpoint: 'https://cms.example.test/items/lead_dedupe_keys',
    accessToken: 'server-only-token',
    dedupeSecret: 'test-only-dedupe-secret',
    fetchImpl: async (url) => {
      requestedUrl = String(url);
      return Response.json({ data: [] });
    }
  });

  await store.hasRecentPhone('13738375470', '2026-07-30T00:00:00.000Z');

  assert.match(requestedUrl, /fields=key_hash/);
  assert.doesNotMatch(requestedUrl, /fields=id/);
});

test('Nuxt lead store accepts Directus minimal create responses when private lead read is forbidden', async () => {
  let requestCount = 0;
  const store = createCmsLeadStore({
    endpoint: 'https://cms.example.test/items/leads',
    dedupeKeysEndpoint: 'https://cms.example.test/items/lead_dedupe_keys',
    notificationJobsEndpoint: 'https://cms.example.test/items/lead_notification_jobs',
    accessToken: 'server-only-token',
    dedupeSecret: 'test-only-dedupe-secret',
    fetchImpl: async () => {
      requestCount += 1;
      return new Response(null, { status: 204 });
    }
  });
  const lead = { leadReference: 'b1111111-1111-4111-8111-111111111111', name: 'E2E Test', phone: '13000000002', leadType: 'quote', requirement: '', pagePath: '/product/', source: 'official_site', consentAt: '2026-07-31T00:00:00.000Z' };

  assert.deepEqual(await store.create(lead), { status: 'new', notificationQueued: true });
  assert.equal(requestCount, 3);
});

test('Nuxt lead store binds only uploaded, unexpired private attachment sessions after the lead is durable', async () => {
  let leadBody;
  let attached;
  const attachmentStore = {
    getSession: async (reference) => ({
      id: 'session-1', attachmentReference: reference, fileId: 'file-1', status: 'uploaded',
      expiresAt: '2026-08-01T11:00:00.000Z', leadReference: null
    }),
    markAttached: async (entries, leadReference) => { attached = { entries, leadReference }; }
  };
  const store = createCmsLeadStore({
    endpoint: 'https://cms.example.test/items/leads',
    dedupeKeysEndpoint: 'https://cms.example.test/items/lead_dedupe_keys',
    accessToken: 'server-only-token', dedupeSecret: 'test-only-dedupe-secret', attachmentStore,
    now: () => new Date('2026-08-01T10:00:00.000Z'),
    fetchImpl: async (url, options = {}) => {
      if (String(url).includes('lead_dedupe_keys')) return Response.json({ data: { id: 'dedupe-1' } });
      leadBody = JSON.parse(options.body);
      return Response.json({ data: { id: 'lead-1' } });
    }
  });
  const lead = { leadReference: 'c1111111-1111-4111-8111-111111111111', name: 'E2E Test', phone: '13000000003', leadType: 'quote', requirement: '', pagePath: '/product/', source: 'official_site', consentAt: '2026-08-01T10:00:00.000Z', attachmentReferences: ['attachment-1'] };

  await store.create(lead);

  assert.deepEqual(leadBody.attachment_ids, ['file-1']);
  assert.equal(attached.leadReference, lead.leadReference);
  assert.equal(attached.entries[0].fileId, 'file-1');
});

test('Nuxt lead store rejects missing, expired, already bound, or incomplete attachment sessions before creating a lead', async () => {
  const store = createCmsLeadStore({
    endpoint: 'https://cms.example.test/items/leads', dedupeKeysEndpoint: 'https://cms.example.test/items/lead_dedupe_keys',
    accessToken: 'server-only-token', dedupeSecret: 'test-only-dedupe-secret',
    attachmentStore: { getSession: async () => ({ status: 'uploaded', fileId: 'file-1', expiresAt: '2026-08-01T09:59:59.000Z', leadReference: null }) },
    now: () => new Date('2026-08-01T10:00:00.000Z'), fetchImpl: async () => Response.json({ data: {} })
  });
  const lead = { leadReference: 'd1111111-1111-4111-8111-111111111111', name: 'E2E Test', phone: '13000000004', leadType: 'quote', requirement: '', pagePath: '/product/', source: 'official_site', consentAt: '2026-08-01T10:00:00.000Z', attachmentReferences: ['attachment-1'] };

  await assert.rejects(store.create(lead), /attachment session/i);
});
