import { randomUUID } from 'node:crypto';

const allowedLeadTypes = new Set(['selection', 'quote', 'sample', 'partner', 'other']);
const allowedSourcePages = new Set(['/', '/contact/', '/product/', '/product/detail/', '/manufacturing/', '/about/', '/service/']);

export class LeadSubmissionError extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    this.name = 'LeadSubmissionError';
    this.code = code;
  }
}

function normalizeText(value, maxLength) {
  return String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function normalizePhone(value) {
  const phone = String(value || '').normalize('NFKC').trim().replace(/[\s()-]/g, '');
  return /^\+?\d{6,20}$/.test(phone) ? phone : null;
}

function normalizeAttachmentReferences(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 3) return null;
  const references = value.map((reference) => String(reference || '').trim());
  if (references.some((reference) => !/^[A-Za-z0-9_-]{8,128}$/.test(reference)) || new Set(references).size !== references.length) return null;
  return references;
}

export async function submitLead({ payload, store, locks = new Set(), idFactory = randomUUID, now = () => new Date() }) {
  const name = normalizeText(payload?.name, 80);
  const phone = normalizePhone(payload?.phone);
  const leadType = String(payload?.leadType || '').trim();
  const requirement = normalizeText(payload?.requirement, 2_000);
  const pagePath = String(payload?.pagePath || '').trim();
  const attachmentReferences = normalizeAttachmentReferences(payload?.attachmentReferences);
  if (!name) throw new LeadSubmissionError('NAME_REQUIRED', '请填写称呼');
  if (!phone) throw new LeadSubmissionError('INVALID_PHONE', '请填写有效的联系电话');
  if (!allowedLeadTypes.has(leadType)) throw new LeadSubmissionError('INVALID_LEAD_TYPE', '请选择咨询类型');
  if (payload?.consent !== true) throw new LeadSubmissionError('CONSENT_REQUIRED', '请先同意个人信息用于处理本次咨询');
  if (!allowedSourcePages.has(pagePath)) throw new LeadSubmissionError('INVALID_PAGE_PATH', '页面来源无效');
  if (!store?.hasRecentPhone) throw new LeadSubmissionError('LEAD_STORE_UNAVAILABLE', '咨询服务暂时不可用，请稍后再试或通过服务支持页面联系瑞钧');

  const cutoff = new Date(now().getTime() - 24 * 60 * 60 * 1000).toISOString();
  if (!attachmentReferences) throw new LeadSubmissionError('INVALID_ATTACHMENTS', '附件信息无效');
  if (locks.has(phone) || await store.hasRecentPhone(phone, cutoff)) {
    throw new LeadSubmissionError('DUPLICATE_LEAD', '我们已收到该联系电话的咨询，请勿重复提交');
  }
  if (!store.create) throw new LeadSubmissionError('LEAD_STORE_UNAVAILABLE', '咨询服务暂时不可用，请稍后再试或通过服务支持页面联系瑞钧');
  locks.add(phone);
  try {
    const consentAt = now().toISOString();
    const leadReference = idFactory();
    const stored = await store.create({
      leadReference, name, phone, leadType, requirement, pagePath, source: 'official_site', consentAt,
      ...(attachmentReferences.length > 0 ? { attachmentReferences } : {})
    });
    if (stored?.duplicate) throw new LeadSubmissionError('DUPLICATE_LEAD', '我们已收到该联系电话的咨询，请勿重复提交');
    return { leadReference, status: stored.status };
  } finally {
    locks.delete(phone);
  }
}
