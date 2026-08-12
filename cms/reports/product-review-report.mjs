import { assessProductModel, assessProductParameter, assessProductSeries, sortProductRecords, text } from './product-review-rules.mjs';

function evidence(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function buildProductTechnicalReviewReport({ series, models, parameters } = {}, { generatedAt = new Date() } = {}) {
  const seriesRecords = sortProductRecords(Array.isArray(series) ? series : [], assessProductSeries, (item) => text(item.name, text(item.series_code, '')));
  const modelRecords = sortProductRecords(Array.isArray(models) ? models : [], assessProductModel, (item) => text(item.name, text(item.model_code, '')));
  const parameterRecords = sortProductRecords(Array.isArray(parameters) ? parameters : [], assessProductParameter, (item) => `${text(item.model_code, '')} / ${text(item.field_name, '')}`);
  const unresolvedMappings = modelRecords.filter((item) => assessProductModel(item).includes('系列归属待产品负责人确认')).length;
  const parameterConflicts = modelRecords.filter((item) => assessProductModel(item).some((issue) => issue.startsWith('参数冲突：'))).length;
  const parameterRecordsWithConflicts = parameterRecords.filter((item) => assessProductParameter(item).includes('参数来源冲突待技术确认')).length;
  const pendingAliases = seriesRecords.filter((item) => assessProductSeries(item).some((issue) => issue.startsWith('待确认系列别名：'))).length;
  const lines = [
    '# 产品主数据技术审核清单',
    '',
    `生成时间：${generatedAt.toISOString()}`,
    `共 ${seriesRecords.length} 个系列、${modelRecords.length} 个型号、${parameterRecords.length} 条参数。待确认系列归属 ${unresolvedMappings} 条；型号级参数冲突 ${parameterConflicts} 条；独立参数冲突 ${parameterRecordsWithConflicts} 条；待确认系列别名 ${pendingAliases} 条。`,
    '本清单只读，不会改变 CMS 内容、审核状态、产品公开状态或官网缓存。',
    '',
    '## 产品系列',
    ''
  ];
  if (!seriesRecords.length) lines.push('暂无产品系列记录。', '');
  for (const item of seriesRecords) {
    const issues = assessProductSeries(item);
    lines.push(
      `### ${text(item.name)} (${text(item.series_code)})`,
      '',
      `- CMS ID：${text(String(item.id ?? ''), '未分配')}`,
      `- 当前状态：${text(item.status)}/${text(item.publication_state)}`,
      `- 来源：${text(item.source_document)}${text(item.source_url, '') ? `；${text(item.source_url, '')}` : ''}`,
      `- 审核提示：${issues.length ? issues.join('；') : '无'}`,
      `- 导入说明：${text(item.review_note)}`,
      ''
    );
  }
  lines.push('## 产品型号', '');
  if (!modelRecords.length) lines.push('暂无产品型号记录。', '');
  for (const item of modelRecords) {
    const issues = assessProductModel(item);
    lines.push(
      `### ${text(item.name)} (${text(item.model_code)})`,
      '',
      `- CMS ID：${text(String(item.id ?? ''), '未分配')}`,
      `- 系列：${text(item.series_code)}`,
      `- 当前状态：${text(item.status)}/${text(item.publication_state)}`,
      `- 来源：${text(item.source_document)}${text(item.source_url, '') ? `；${text(item.source_url, '')}` : ''}`,
      `- 审核提示：${issues.length ? issues.join('；') : '无'}`,
      `- 导入说明：${text(item.review_note)}`,
      ''
    );
  }
  lines.push('## 独立产品参数', '');
  if (!parameterRecords.length) lines.push('暂无独立产品参数记录。', '');
  for (const item of parameterRecords) {
    const issues = assessProductParameter(item);
    const importEvidence = evidence(item.import_evidence);
    lines.push(
      `### ${text(item.model_code)} / ${text(item.field_name)}`,
      '',
      `- CMS ID：${text(String(item.id ?? ''), '未分配')}`,
      `- 参数值：${text(item.value)}${text(item.unit, '') ? ` ${text(item.unit, '')}` : ''}`,
      `- 当前状态：${text(item.status)}/${text(item.publication_state)}`,
      `- 来源：${text(item.source_document)}${text(item.source_url, '') ? `；${text(item.source_url, '')}` : ''}`,
      `- 原始参数键：${text(importEvidence.source_key)}`,
      `- 审核提示：${issues.length ? issues.join('；') : '无'}`,
      `- 导入说明：${text(item.review_note)}`,
      ''
    );
  }
  return `${lines.join('\n')}\n`;
}
