import { getHeader, getQuery, getRouterParam, readRawBody, setResponseStatus } from 'h3';
import { CmsLeadAttachmentStoreUnavailable, createCmsLeadAttachmentStore } from '../../../../services/cms-lead-attachment-store.mjs';
import { LeadAttachmentError, createLeadAttachmentUploadService, validateAttachmentBytes } from '../../../../services/lead-attachment-upload.mjs';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const sessionsEndpoint = String(config.cmsLeadUploadSessionsUrl || '');
  const filesEndpoint = String(config.cmsFilesUrl || '');
  const accessToken = String(config.cmsBffToken || '');
  const signingSecret = String(config.leadAttachmentSigningSecret || '');
  if (!sessionsEndpoint || !filesEndpoint || !accessToken || !signingSecret) {
    setResponseStatus(event, 503);
    return { code: 'ATTACHMENT_UPLOAD_UNAVAILABLE', message: '附件上传服务暂不可用' };
  }
  const rawBody = await readRawBody(event, false);
  const bytes = rawBody ? new Uint8Array(rawBody) : new Uint8Array();
  const attachmentReference = String(getRouterParam(event, 'attachmentReference') || '');
  const token = String(getQuery(event).token || '');
  const mimeType = String(getHeader(event, 'content-type') || '').split(';')[0].trim().toLowerCase();
  try {
    const store = createCmsLeadAttachmentStore({ sessionsEndpoint, filesEndpoint, accessToken });
    const service = createLeadAttachmentUploadService({ store, signingSecret });
    const session = await service.authorizeUpload({ attachmentReference, token, mimeType, byteSize: bytes.byteLength });
    validateAttachmentBytes(mimeType, bytes);
    const fileId = await store.uploadPrivateFile({ session, bytes, mimeType });
    await store.markUploaded(session, fileId);
    return { attachmentReference, status: 'uploaded' };
  } catch (error) {
    if (error instanceof LeadAttachmentError) {
      setResponseStatus(event, error.code === 'INVALID_UPLOAD_TICKET' ? 403 : 400);
      return { code: error.code, message: '附件上传验证失败' };
    }
    if (error instanceof CmsLeadAttachmentStoreUnavailable) {
      setResponseStatus(event, 503);
      return { code: 'ATTACHMENT_UPLOAD_UNAVAILABLE', message: '附件上传服务暂不可用' };
    }
    throw error;
  }
});
