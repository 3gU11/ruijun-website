function text(value, fallback = '未填写') {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
}

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function hasValue(value) {
  return Object.values(record(value)).some((item) => typeof item === 'string' ? Boolean(item.trim()) : item != null);
}

export function assessServiceResource(resource) {
  const issues = [];
  if (!text(resource.source_key, '')) issues.push('来源键');
  if (!text(resource.type, '')) issues.push('资料类型');
  if (!text(resource.source_document, '') && !text(resource.source_url, '')) issues.push('来源文件或地址');
  if (!text(resource.asset, '')) issues.push('受控文件未上传');
  if (!text(resource.version, '')) issues.push('版本待确认');
  if (!text(resource.updated_at, '')) issues.push('更新时间待确认');
  return issues;
}

export function assessServiceLocation(location) {
  const issues = [];
  if (!text(location.source_key, '')) issues.push('来源键');
  if (!text(location.region, '')) issues.push('省份或区域');
  if (!text(location.city, '')) issues.push('城市');
  if (!text(location.service_scope, '')) issues.push('服务范围');
  if (!hasValue(location.contact)) issues.push('企业联系方式待确认');
  if (!text(location.valid_until, '')) issues.push('有效期待确认');
  if (text(location.business_status, '') !== 'active') issues.push('营业或服务状态未确认');
  return issues;
}

export function serviceEntryRoute(entry) {
  try {
    const url = new URL(String(entry.url || ''));
    const local = ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(url.hostname);
    return { route: url.pathname || '/', isLocal: local, valid: ['http:', 'https:'].includes(url.protocol) };
  } catch {
    return { route: '无有效路径', isLocal: false, valid: false };
  }
}

export function assessServiceEntry(entry) {
  const target = serviceEntryRoute(entry);
  const issues = [];
  if (!text(entry.entry_type, '')) issues.push('入口类型');
  if (!target.valid) issues.push('目标地址无效');
  if (target.isLocal) issues.push('暂存本机地址');
  if (entry.enabled !== true) issues.push('入口未启用');
  if (text(entry.health_status, '') !== 'available') issues.push('售后健康状态未确认');
  if (text(entry.open_mode, '') !== 'new_tab') issues.push('新窗口打开方式待确认');
  if (text(entry.status, '') !== 'published' || text(entry.publication_state, '') !== 'published') issues.push('未完成发布');
  if (!text(entry.fallback_phone, '')) issues.push('人工兜底待确认');
  return { target, issues };
}

function sortRecords(records, issueResolver, labelResolver) {
  return [...records].sort((left, right) => issueResolver(right).length - issueResolver(left).length
    || labelResolver(left).localeCompare(labelResolver(right), 'zh-CN'));
}

export function buildServiceContentReviewReport({ resources, locations, entries } = {}, { generatedAt = new Date() } = {}) {
  const resourceRecords = sortRecords(Array.isArray(resources) ? resources : [], assessServiceResource, (item) => text(item.source_key, ''));
  const locationRecords = sortRecords(Array.isArray(locations) ? locations : [], assessServiceLocation, (item) => `${text(item.region, '')}${text(item.city, '')}`);
  const entryRecords = [...(Array.isArray(entries) ? entries : [])].sort((left, right) => assessServiceEntry(right).issues.length - assessServiceEntry(left).issues.length
    || text(left.entry_type, '').localeCompare(text(right.entry_type, ''), 'zh-CN'));
  const missingAssets = resourceRecords.filter((item) => assessServiceResource(item).includes('受控文件未上传')).length;
  const incompleteLocations = locationRecords.filter((item) => assessServiceLocation(item).length > 0).length;
  const unavailableEntries = entryRecords.filter((item) => assessServiceEntry(item).issues.length > 0).length;
  const lines = [
    '# 服务支持内容审核清单',
    '',
    `生成时间：${generatedAt.toISOString()}`,
    `共 ${resourceRecords.length} 份服务资料、${locationRecords.length} 个服务网点、${entryRecords.length} 个售后入口。待上传受控文件 ${missingAssets} 条；待确认网点信息 ${incompleteLocations} 条；不可公开售后入口 ${unavailableEntries} 条。`,
    '本清单只读，不会改变 CMS 内容、审核状态、入口健康状态、官网缓存或外部售后系统。联系方式和目标域名仅以审核状态呈现，不输出具体值。',
    '',
    '## 服务资料',
    ''
  ];
  if (!resourceRecords.length) lines.push('暂无服务资料记录。', '');
  for (const item of resourceRecords) {
    const issues = assessServiceResource(item);
    lines.push(
      `### ${text(item.source_key)}`,
      '',
      `- CMS ID：${text(String(item.id ?? ''), '未分配')}`,
      `- 类型与语言：${text(item.type)} / ${text(item.language)}`,
      `- 当前状态：${text(item.status)}/${text(item.publication_state)}`,
      `- 受控文件：${text(item.asset, '') ? '已关联' : '未关联'}`,
      `- 审核提示：${issues.length ? issues.join('；') : '无'}`,
      `- 导入说明：${text(item.review_note)}`,
      ''
    );
  }
  lines.push('## 服务网点', '');
  if (!locationRecords.length) lines.push('暂无服务网点记录。', '');
  for (const item of locationRecords) {
    const issues = assessServiceLocation(item);
    lines.push(
      `### ${text(item.region)} ${text(item.city)}`,
      '',
      `- CMS ID：${text(String(item.id ?? ''), '未分配')}`,
      `- 当前状态：${text(item.status)}/${text(item.publication_state)}`,
      `- 联系方式：${hasValue(item.contact) ? '已填写，须单独核验' : '未填写'}`,
      `- 审核提示：${issues.length ? issues.join('；') : '无'}`,
      `- 导入说明：${text(item.review_note)}`,
      ''
    );
  }
  lines.push('## 售后入口', '');
  if (!entryRecords.length) lines.push('暂无售后入口记录。', '');
  for (const item of entryRecords) {
    const { target, issues } = assessServiceEntry(item);
    lines.push(
      `### ${text(item.entry_type)}`,
      '',
      `- CMS ID：${text(String(item.id ?? ''), '未分配')}`,
      `- 目标路径：${target.route}`,
      `- 当前状态：${text(item.status)}/${text(item.publication_state)}；启用：${item.enabled === true ? '是' : '否'}；健康：${text(item.health_status)}`,
      `- 人工兜底：${text(item.fallback_phone, '') ? '已配置，须业务确认' : '未配置'}`,
      `- 审核提示：${issues.length ? issues.join('；') : '无'}`,
      `- 导入说明：${text(item.review_note)}`,
      ''
    );
  }
  return `${lines.join('\n')}\n`;
}
