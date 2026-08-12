import assert from 'node:assert/strict';
import test from 'node:test';

const { LeadSubmissionError, submitLead } = await import('../server/services/lead-submission.mjs');

const validPayload = {
  name: '张工', phone: '137 3837 5470', leadType: 'quote', requirement: '加工需求', consent: true, pagePath: '/product/'
};

test('lead submission accepts only approved public fields and normalizes a valid lead', async () => {
  let created;
  const result = await submitLead({
    payload: { ...validPayload, ignored: 'must not be sent to CMS' },
    store: {
      hasRecentPhone: async () => false,
      create: async (lead) => { created = lead; return { status: 'new' }; }
    },
    idFactory: () => 'a1111111-1111-4111-8111-111111111111', now: () => new Date('2026-07-31T00:00:00.000Z')
  });

  assert.deepEqual(result, { leadReference: 'a1111111-1111-4111-8111-111111111111', status: 'new' });
  assert.deepEqual(created, {
    leadReference: 'a1111111-1111-4111-8111-111111111111', name: '张工', phone: '13738375470', leadType: 'quote',
    requirement: '加工需求', pagePath: '/product/', source: 'official_site', consentAt: '2026-07-31T00:00:00.000Z'
  });
});

test('lead submission accepts the standalone contact page as a source', async () => {
  let created;
  await submitLead({
    payload: { ...validPayload, pagePath: '/contact/' },
    store: { hasRecentPhone: async () => false, create: async (lead) => { created = lead; return { status: 'new' }; } },
    idFactory: () => 'b1111111-1111-4111-8111-111111111111', now: () => new Date('2026-08-08T00:00:00.000Z')
  });
  assert.equal(created.pagePath, '/contact/');
});

test('lead submission requires consent and blocks repeated phone numbers', async () => {
  await assert.rejects(
    submitLead({ payload: { ...validPayload, consent: false }, store: {} }),
    (error) => error instanceof LeadSubmissionError && error.code === 'CONSENT_REQUIRED'
  );
  await assert.rejects(
    submitLead({ payload: validPayload, store: { hasRecentPhone: async () => true } }),
    (error) => error instanceof LeadSubmissionError && error.code === 'DUPLICATE_LEAD'
  );
});

test('lead submission forwards at most three well-formed attachment references and rejects malformed attachment input', async () => {
  let created;
  const store = { hasRecentPhone: async () => false, create: async (lead) => { created = lead; return { status: 'new' }; } };
  await submitLead({
    payload: { ...validPayload, attachmentReferences: ['attachment-1', 'attachment_2'] }, store,
    idFactory: () => 'e1111111-1111-4111-8111-111111111111', now: () => new Date('2026-08-01T10:00:00.000Z')
  });
  assert.deepEqual(created.attachmentReferences, ['attachment-1', 'attachment_2']);
  await assert.rejects(
    submitLead({ payload: { ...validPayload, attachmentReferences: ['attachment-1', 'attachment-1'] }, store }),
    (error) => error instanceof LeadSubmissionError && error.code === 'INVALID_ATTACHMENTS'
  );
  await assert.rejects(
    submitLead({ payload: { ...validPayload, attachmentReferences: ['a', 'b', 'c', 'd'] }, store }),
    (error) => error instanceof LeadSubmissionError && error.code === 'INVALID_ATTACHMENTS'
  );
});
