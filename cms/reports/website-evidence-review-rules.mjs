import { MediaAssetGovernanceError, collectMediaAssetReferenceIds } from '../content-workflow/media-asset-governance.mjs';

const confirmedAuthorizationStatuses = new Set(['owned', 'licensed', 'authorized']);

function text(value) {
  return typeof value === 'string' ? value.normalize('NFKC').trim() : '';
}

function hasSource(record) {
  return Boolean(text(record?.source_document) || text(record?.source_url));
}

function hasControlledMedia(record) {
  try {
    return collectMediaAssetReferenceIds(record).length > 0;
  } catch (error) {
    if (error instanceof MediaAssetGovernanceError) return false;
    throw error;
  }
}

export function isAuthorizationConfirmed(value) {
  return confirmedAuthorizationStatuses.has(text(value).toLowerCase());
}

export function assessManufacturingEvidence(record) {
  const issues = [];
  if (!text(record?.source_key)) issues.push('来源键');
  if (!text(record?.process)) issues.push('制造环节');
  if (!text(record?.description)) issues.push('说明');
  if (!hasControlledMedia(record)) issues.push('受控媒体未关联');
  if (!text(record?.inspection_evidence)) issues.push('检测依据');
  if (!hasSource(record)) issues.push('来源文件或地址');
  return issues;
}

export function assessQualification(record) {
  const issues = [];
  const type = text(record?.type).toLowerCase();
  if (!text(record?.source_key)) issues.push('来源键');
  if (!type) issues.push('资质类型');
  if (!text(record?.name)) issues.push('资质名称');
  if (['certificate', 'patent'].includes(type) && !text(record?.certificate_number)) issues.push('证书编号');
  if (!text(record?.issuer)) issues.push('颁发方');
  if (type === 'certificate' && !text(record?.valid_until)) issues.push('有效期');
  if (!hasControlledMedia(record)) issues.push('受控媒体未关联');
  if (!isAuthorizationConfirmed(record?.authorization_status)) issues.push('授权状态待确认');
  if (!hasSource(record)) issues.push('来源文件或地址');
  return issues;
}

export function assessMilestone(record) {
  const issues = [];
  if (!text(record?.source_key)) issues.push('来源键');
  if (record?.year == null || record.year === '' || !Number.isSafeInteger(Number(record.year))) issues.push('年份');
  if (!text(record?.event)) issues.push('历程事件');
  if (!text(record?.evidence)) issues.push('佐证材料');
  if (!hasSource(record)) issues.push('来源文件或地址');
  return issues;
}
