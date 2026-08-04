import { assessProductModel, assessProductSeries, sortProductRecords, text } from './product-review-rules.mjs';

export function buildProductTechnicalReviewReport({ series, models } = {}, { generatedAt = new Date() } = {}) {
  const seriesRecords = sortProductRecords(Array.isArray(series) ? series : [], assessProductSeries, (item) => text(item.name, text(item.series_code, '')));
  const modelRecords = sortProductRecords(Array.isArray(models) ? models : [], assessProductModel, (item) => text(item.name, text(item.model_code, '')));
  const unresolvedMappings = modelRecords.filter((item) => assessProductModel(item).includes('系列归属待产品负责人确认')).length;
  const parameterConflicts = modelRecords.filter((item) => assessProductModel(item).some((issue) => issue.startsWith('参数冲突：'))).length;
  const pendingAliases = seriesRecords.filter((item) => assessProductSeries(item).some((issue) => issue.startsWith('待确认系列别名：'))).length;
  const lines = [
    '# 产品主数据技术审核清单',
    '',
    `生成时间：${generatedAt.toISOString()}`,
    `共 ${seriesRecords.length} 个系列、${modelRecords.length} 个型号。待确认系列归属 ${unresolvedMappings} 条；参数冲突 ${parameterConflicts} 条；待确认系列别名 ${pendingAliases} 条。`,
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
  return `${lines.join('\n')}\n`;
}
