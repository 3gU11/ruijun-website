import { randomUUID } from 'node:crypto';

export class CmsLeadAttachmentStoreUnavailable extends Error {
  constructor(cause) {
    super('CMS lead attachment store is unavailable', { cause });
    this.name = 'CmsLeadAttachmentStoreUnavailable';
  }
}

const sessionFields = ['id', 'upload_reference', 'file_name', 'mime_type', 'byte_size', 'file_id', 'expires_at', 'lead_reference', 'status'];

function headers(accessToken) {
  return { Accept: 'application/json', Authorization: `Bearer ${accessToken}` };
}

export function createCmsLeadAttachmentStore({ sessionsEndpoint, filesEndpoint, accessToken, idFactory = randomUUID, fetchImpl = fetch }) {
  if (!sessionsEndpoint || !filesEndpoint || !accessToken) {
    throw new TypeError('sessionsEndpoint, filesEndpoint, and accessToken are required');
  }
  const authenticatedHeaders = headers(accessToken);

  async function responseData(response) {
    if (!response.ok) throw new Error(`CMS responded ${response.status}`);
    if (response.status === 204) return null;
    const payload = await response.json();
    return payload?.data ?? null;
  }

  return {
    async createSession(session) {
      try {
        const response = await fetchImpl(sessionsEndpoint, {
          method: 'POST',
          headers: { ...authenticatedHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            upload_reference: session.attachmentReference, file_name: session.fileName, mime_type: session.mimeType,
            byte_size: session.byteSize, file_id: null, expires_at: session.expiresAt, lead_reference: null,
            status: 'pending', publication_state: 'private'
          })
        });
        await responseData(response);
      } catch (error) {
        throw new CmsLeadAttachmentStoreUnavailable(error);
      }
    },

    async getSession(attachmentReference) {
      try {
        const url = new URL(sessionsEndpoint);
        url.searchParams.set('filter[upload_reference][_eq]', attachmentReference);
        url.searchParams.set('limit', '1');
        url.searchParams.set('fields', sessionFields.join(','));
        const data = await responseData(await fetchImpl(url, { headers: authenticatedHeaders }));
        const session = Array.isArray(data) ? data[0] : null;
        return session ? {
          id: session.id, attachmentReference: session.upload_reference, fileName: session.file_name,
          mimeType: session.mime_type, byteSize: Number(session.byte_size), fileId: session.file_id,
          expiresAt: session.expires_at, leadReference: session.lead_reference, status: session.status
        } : null;
      } catch (error) {
        throw new CmsLeadAttachmentStoreUnavailable(error);
      }
    },

    async uploadPrivateFile({ session, bytes, mimeType }) {
      try {
        const generatedFileId = String(idFactory());
        const form = new FormData();
        form.set('id', generatedFileId);
        form.set('title', session.fileName);
        form.set('file', new Blob([bytes], { type: mimeType }), session.fileName);
        const data = await responseData(await fetchImpl(filesEndpoint, { method: 'POST', headers: authenticatedHeaders, body: form }));
        return data?.id || generatedFileId;
      } catch (error) {
        throw new CmsLeadAttachmentStoreUnavailable(error);
      }
    },

    async markUploaded(session, fileId) {
      try {
        if (!session?.id || !fileId) throw new Error('A persisted session and private file ID are required');
        const response = await fetchImpl(`${sessionsEndpoint.replace(/\/$/, '')}/${encodeURIComponent(session.id)}`, {
          method: 'PATCH', headers: { ...authenticatedHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_id: fileId, status: 'uploaded' })
        });
        await responseData(response);
      } catch (error) {
        throw new CmsLeadAttachmentStoreUnavailable(error);
      }
    },

    async markAttached(entries, leadReference) {
      try {
        await Promise.all(entries.map(async ({ session, fileId }) => {
          if (!session?.id || !fileId) throw new Error('A persisted session and private file ID are required');
          const response = await fetchImpl(`${sessionsEndpoint.replace(/\/$/, '')}/${encodeURIComponent(session.id)}`, {
            method: 'PATCH', headers: { ...authenticatedHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_id: fileId, lead_reference: leadReference, status: 'attached' })
          });
          await responseData(response);
        }));
      } catch (error) {
        throw new CmsLeadAttachmentStoreUnavailable(error);
      }
    }
  };
}
