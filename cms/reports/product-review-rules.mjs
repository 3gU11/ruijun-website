export function text(value, fallback = '未填写') {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
}

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function values(value) {
  return Array.isArray(value) ? value.map((item) => text(item, '')).filter(Boolean) : [];
}

function hasParameters(value) {
  return Object.values(record(value)).some((item) => text(item, ''));
}

export function assessProductModel(model) {
  const evidence = record(model?.import_evidence);
  const issues = [];
  if (!text(model?.model_code, '')) issues.push('型号编码');
  if (!text(model?.series_code, '')) issues.push('系列编码');
  if (!text(model?.source_document, '') && !text(model?.source_url, '')) issues.push('来源文件或地址');
  if (!hasParameters(model?.parameters)) issues.push('结构化参数');
  if (text(evidence.series_mapping_status, '') === 'needs_product_owner_confirmation') issues.push('系列归属待产品负责人确认');
  const conflicts = values(evidence.parameter_conflicts);
  if (conflicts.length) issues.push(`参数冲突：${conflicts.join('、')}`);
  const observedNames = values(evidence.observed_model_names);
  if (observedNames.length > 1) issues.push(`观察到多个型号名称：${observedNames.join('、')}`);
  return issues;
}

export function assessProductSeries(series) {
  const evidence = record(series?.import_evidence);
  const issues = [];
  if (!text(series?.series_code, '')) issues.push('系列编码');
  if (!text(series?.name, '')) issues.push('系列名称');
  if (!text(series?.source_document, '') && !text(series?.source_url, '')) issues.push('来源文件或地址');
  const aliases = values(evidence.aliases_pending_review);
  if (aliases.length) issues.push(`待确认系列别名：${aliases.join('、')}`);
  return issues;
}

export function compareProductRecords(left, right, issueResolver, labelResolver) {
  return issueResolver(right).length - issueResolver(left).length
    || labelResolver(left).localeCompare(labelResolver(right), 'zh-CN');
}

export function sortProductRecords(records, issueResolver, labelResolver) {
  return [...records].sort((left, right) => compareProductRecords(left, right, issueResolver, labelResolver));
}
