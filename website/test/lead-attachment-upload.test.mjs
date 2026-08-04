import assert from 'node:assert/strict';
import test from 'node:test';

const { LeadAttachmentError, createLeadAttachmentUploadService, validateAttachmentBytes } = await import('../server/services/lead-attachment-upload.mjs');

function createStore() {
  const sessions = new Map();
  return {
    sessions,
    async createSession(session) { sessions.set(session.attachmentReference, session); },
    async getSession(reference) { return sessions.get(reference) || null; }
  };
}

test('lead attachment upload creates a short-lived signed upload URL for an allowed private file', async () => {
  const store = createStore();
  const service = createLeadAttachmentUploadService({
    store, signingSecret: 'test-only-signing-secret',
    idFactory: () => 'attachment-1', now: () => new Date('2026-08-01T10:00:00.000Z')
  });

  const intent = await service.createIntent({ fileName: 'drawing.pdf', mimeType: 'application/pdf', byteSize: 4_096 });

  assert.deepEqual(intent, {
    attachmentReference: 'attachment-1',
    uploadUrl: '/api/public/v1/lead-attachments/attachment-1?token=' + intent.uploadUrl.split('token=').at(-1),
    expiresAt: '2026-08-01T10:15:00.000Z'
  });
  assert.equal(store.sessions.get('attachment-1').status, 'pending');
  assert.equal(store.sessions.get('attachment-1').fileName, 'drawing.pdf');
  await assert.doesNotReject(service.authorizeUpload({
    attachmentReference: 'attachment-1', token: intent.uploadUrl.split('token=').at(-1),
    mimeType: 'application/pdf', byteSize: 4_096
  }));
});

test('lead attachment upload rejects oversized or unapproved files and tampered upload tickets', async () => {
  const store = createStore();
  const service = createLeadAttachmentUploadService({
    store, signingSecret: 'test-only-signing-secret',
    idFactory: () => 'attachment-2', now: () => new Date('2026-08-01T10:00:00.000Z')
  });

  await assert.rejects(
    service.createIntent({ fileName: 'installer.exe', mimeType: 'application/octet-stream', byteSize: 100 }),
    (error) => error instanceof LeadAttachmentError && error.code === 'UNSUPPORTED_ATTACHMENT'
  );
  await assert.rejects(
    service.createIntent({ fileName: 'large.pdf', mimeType: 'application/pdf', byteSize: 10 * 1024 * 1024 + 1 }),
    (error) => error instanceof LeadAttachmentError && error.code === 'ATTACHMENT_TOO_LARGE'
  );
  const intent = await service.createIntent({ fileName: 'photo.png', mimeType: 'image/png', byteSize: 100 });
  await assert.rejects(
    service.authorizeUpload({ attachmentReference: 'attachment-2', token: `${intent.uploadUrl.split('token=').at(-1)}x`, mimeType: 'image/png', byteSize: 100 }),
    (error) => error instanceof LeadAttachmentError && error.code === 'INVALID_UPLOAD_TICKET'
  );
});

test('lead attachment upload refuses expired, altered, or already attached upload sessions', async () => {
  const store = createStore();
  const service = createLeadAttachmentUploadService({
    store, signingSecret: 'test-only-signing-secret',
    idFactory: () => 'attachment-3', now: () => new Date('2026-08-01T10:00:00.000Z')
  });
  const intent = await service.createIntent({ fileName: 'photo.jpg', mimeType: 'image/jpeg', byteSize: 100 });
  store.sessions.get('attachment-3').status = 'attached';
  await assert.rejects(
    service.authorizeUpload({ attachmentReference: 'attachment-3', token: intent.uploadUrl.split('token=').at(-1), mimeType: 'image/jpeg', byteSize: 100 }),
    (error) => error instanceof LeadAttachmentError && error.code === 'UPLOAD_SESSION_UNAVAILABLE'
  );
});

test('lead attachment upload verifies the advertised MIME type against a safe file signature before private persistence', () => {
  assert.doesNotThrow(() => validateAttachmentBytes('application/pdf', new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])));
  assert.doesNotThrow(() => validateAttachmentBytes('image/png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])));
  assert.throws(
    () => validateAttachmentBytes('image/jpeg', new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])),
    (error) => error instanceof LeadAttachmentError && error.code === 'ATTACHMENT_CONTENT_MISMATCH'
  );
});
