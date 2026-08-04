import { readBody, setResponseStatus } from 'h3';
import { CmsLeadAttachmentStoreUnavailable, createCmsLeadAttachmentStore } from '../../../services/cms-lead-attachment-store.mjs';
import { LeadAttachmentError, createLeadAttachmentUploadService } from '../../../services/lead-attachment-upload.mjs';

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
  try {
    const payload = await readBody(event);
    const store = createCmsLeadAttachmentStore({ sessionsEndpoint, filesEndpoint, accessToken });
    return await createLeadAttachmentUploadService({ store, signingSecret }).createIntent(payload);
  } catch (error) {
    if (error instanceof LeadAttachmentError) {
      setResponseStatus(event, 400);
      return { code: error.code, message: '附件格式或大小不符合要求' };
    }
    if (error instanceof CmsLeadAttachmentStoreUnavailable) {
      setResponseStatus(event, 503);
      return { code: 'ATTACHMENT_UPLOAD_UNAVAILABLE', message: '附件上传服务暂不可用' };
    }
    throw error;
  }
});
