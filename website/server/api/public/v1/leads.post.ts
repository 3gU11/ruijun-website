import { readBody, setResponseStatus } from 'h3';
import { CmsLeadAttachmentInvalid, CmsLeadStoreUnavailable, createCmsLeadStore } from '../../../services/cms-lead-store.mjs';
import { createCmsLeadAttachmentStore } from '../../../services/cms-lead-attachment-store.mjs';
import { LeadSubmissionError, submitLead } from '../../../services/lead-submission.mjs';

const leadSubmissionLocks = new Set<string>();

function responseStatus(error: LeadSubmissionError) {
  if (error.code === 'DUPLICATE_LEAD') return 409;
  if (error.code === 'LEAD_STORE_UNAVAILABLE') return 503;
  return 400;
}

export default defineEventHandler(async (event) => {
  let payload;
  try {
    payload = await readBody(event);
  } catch {
    setResponseStatus(event, 400);
    return { code: 'INVALID_REQUEST', message: '提交格式无效' };
  }
  const config = useRuntimeConfig(event);
  const endpoint = String(config.cmsLeadsUrl || '');
  const accessToken = String(config.cmsBffToken || '');
  const dedupeKeysEndpoint = String(config.cmsLeadDedupeKeysUrl || '');
  const dedupeSecret = String(config.leadDedupeSecret || '');
  const attachmentStore = config.cmsLeadUploadSessionsUrl && config.cmsFilesUrl && accessToken
    ? createCmsLeadAttachmentStore({ sessionsEndpoint: String(config.cmsLeadUploadSessionsUrl), filesEndpoint: String(config.cmsFilesUrl), accessToken })
    : null;
  const store = endpoint && accessToken
    ? createCmsLeadStore({ endpoint, dedupeKeysEndpoint, dedupeSecret, notificationJobsEndpoint: String(config.cmsLeadNotificationJobsUrl || ''), attachmentStore, accessToken })
    : null;
  try {
    const result = await submitLead({ payload, store, locks: leadSubmissionLocks });
    setResponseStatus(event, 201);
    return result;
  } catch (error) {
    if (error instanceof LeadSubmissionError) {
      setResponseStatus(event, responseStatus(error));
      return { code: error.code, message: error.message };
    }
    if (error instanceof CmsLeadStoreUnavailable) {
      setResponseStatus(event, 503);
      return { code: 'LEAD_STORE_UNAVAILABLE', message: '咨询服务暂时不可用，请稍后再试或通过服务支持页面联系瑞钧' };
    }
    if (error instanceof CmsLeadAttachmentInvalid) {
      setResponseStatus(event, 400);
      return { code: 'INVALID_ATTACHMENTS', message: '附件上传会话无效或已过期，请重新选择文件' };
    }
    throw error;
  }
});
