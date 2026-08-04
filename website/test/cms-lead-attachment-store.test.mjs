import assert from 'node:assert/strict';
import test from 'node:test';

const { createCmsLeadAttachmentStore } = await import('../server/services/cms-lead-attachment-store.mjs');

test('CMS lead attachment store persists private upload sessions and uses only the server BFF token', async () => {
  const requests = [];
  const store = createCmsLeadAttachmentStore({
    sessionsEndpoint: 'https://cms.example.test/items/lead_upload_sessions',
    filesEndpoint: 'https://cms.example.test/files', accessToken: 'server-only-token',
    fetchImpl: async (url, options = {}) => {
      requests.push({ url: String(url), options });
      return Response.json({ data: { id: 'session-1' } });
    }
  });

  await store.createSession({
    attachmentReference: 'attachment-1', fileName: 'drawing.pdf', mimeType: 'application/pdf', byteSize: 4_096,
    status: 'pending', expiresAt: '2026-08-01T10:15:00.000Z', createdAt: '2026-08-01T10:00:00.000Z'
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.headers.Authorization, 'Bearer server-only-token');
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    upload_reference: 'attachment-1', file_name: 'drawing.pdf', mime_type: 'application/pdf', byte_size: 4_096,
    file_id: null, expires_at: '2026-08-01T10:15:00.000Z', lead_reference: null,
    status: 'pending', publication_state: 'private'
  });
});

test('CMS lead attachment store reads an approved session by reference, uploads a private file, and records its file ID', async () => {
  const requests = [];
  const store = createCmsLeadAttachmentStore({
    sessionsEndpoint: 'https://cms.example.test/items/lead_upload_sessions',
    filesEndpoint: 'https://cms.example.test/files', accessToken: 'server-only-token',
    fetchImpl: async (url, options = {}) => {
      requests.push({ url: String(url), options });
      if ((options.method || 'GET') === 'GET') return Response.json({ data: [{ id: 'session-1', upload_reference: 'attachment-1', file_name: 'drawing.pdf', mime_type: 'application/pdf', byte_size: 4_096, file_id: null, expires_at: '2026-08-01T10:15:00.000Z', lead_reference: null, status: 'pending' }] });
      if (String(url).endsWith('/files')) return Response.json({ data: { id: 'file-1' } });
      return Response.json({ data: {} });
    }
  });

  const session = await store.getSession('attachment-1');
  const fileId = await store.uploadPrivateFile({ session, bytes: new Uint8Array([1, 2, 3]), mimeType: 'application/pdf' });
  await store.markUploaded(session, fileId);
  await store.markAttached([{ session, fileId }], 'lead-1');

  assert.equal(fileId, 'file-1');
  assert.match(requests[0].url, /filter%5Bupload_reference%5D%5B_eq%5D=attachment-1/);
  assert.match(requests[0].url, /fields=id%2Cupload_reference%2Cfile_name%2Cmime_type%2Cbyte_size%2Cfile_id%2Cexpires_at%2Clead_reference%2Cstatus/);
  assert.equal(requests[1].options.headers.Authorization, 'Bearer server-only-token');
  assert.ok(requests[1].options.body instanceof FormData);
  assert.equal(requests[2].url, 'https://cms.example.test/items/lead_upload_sessions/session-1');
  assert.deepEqual(JSON.parse(requests[2].options.body), { file_id: 'file-1', status: 'uploaded' });
  assert.equal(requests[3].url, 'https://cms.example.test/items/lead_upload_sessions/session-1');
  assert.deepEqual(JSON.parse(requests[3].options.body), { file_id: 'file-1', lead_reference: 'lead-1', status: 'attached' });
});

test('CMS lead attachment store retains a BFF-generated file ID when Directus returns a write-only 204 response', async () => {
  const store = createCmsLeadAttachmentStore({
    sessionsEndpoint: 'https://cms.example.test/items/lead_upload_sessions', filesEndpoint: 'https://cms.example.test/files',
    accessToken: 'server-only-token', idFactory: () => 'file-generated-by-bff',
    fetchImpl: async () => new Response(null, { status: 204 })
  });
  const fileId = await store.uploadPrivateFile({
    session: { fileName: 'drawing.pdf' }, bytes: new Uint8Array([1, 2, 3]), mimeType: 'application/pdf'
  });

  assert.equal(fileId, 'file-generated-by-bff');
});
