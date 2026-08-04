import { assessKnowledgeLifecycleReadiness } from '../content-workflow/knowledge-governance.mjs';

const riskOrder = Object.freeze({ high: 0, medium: 1, low: 2 });

function text(value, fallback = '未填写') {
  const normalized = typeof value === 'string' ? value.normalize('NFKC').trim() : '';
  return normalized || fallback;
}

function risk(value) {
  const normalized = text(value, 'unknown').toLowerCase();
  return Object.hasOwn(riskOrder, normalized) ? normalized : 'unknown';
}

function countByRisk(records) {
  return records.reduce((counts, record) => ({ ...counts, [risk(record.risk_level)]: (counts[risk(record.risk_level)] || 0) + 1 }), {});
}

function formatSteps(value) {
  const steps = Array.isArray(value) ? value : [];
  const contents = steps.map((step) => text(typeof step === 'string' ? step : step?.content, '')).filter(Boolean);
  return contents.length ? contents.map((step, index) => `${index + 1}. ${step}`).join('\n') : '未填写';
}

function formatMissing(assessment) {
  const missing = [...assessment.missing];
  if (assessment.requiresHighRiskSafety) missing.push('高风险安全前置条件与人工升级说明');
  return missing.length ? missing.join('、') : '无';
}

export function buildKnowledgeTechnicalReviewReport(items, { generatedAt = new Date() } = {}) {
  const records = Array.isArray(items) ? [...items] : [];
  records.sort((left, right) => (riskOrder[risk(left.risk_level)] ?? 3) - (riskOrder[risk(right.risk_level)] ?? 3)
    || text(left.question_title, '').localeCompare(text(right.question_title, ''), 'zh-CN')
    || text(left.source_key, '').localeCompare(text(right.source_key, '')));
  const counts = countByRisk(records);
  const lines = [
    '# FAQ 技术审核清单',
    '',
    `生成时间：${generatedAt.toISOString()}`,
    `共 ${records.length} 条：高风险 ${counts.high || 0} 条，中风险 ${counts.medium || 0} 条，低风险 ${counts.low || 0} 条。`,
    '本清单只读，不会改变 CMS 内容、审核状态或 Dify 同步状态。',
    ''
  ];
  for (const record of records) {
    const assessment = assessKnowledgeLifecycleReadiness({ current: record, target: 'review' });
    lines.push(
      `## [${risk(record.risk_level)}] ${text(record.question_title)}`,
      '',
      `- CMS ID：${text(String(record.id ?? ''), '未分配')}`,
      `- 来源键：${text(record.source_key)}`,
      `- 来源文档：${text(record.source_document)}`,
      `- 当前状态：${text(record.status)}/${text(record.publication_state)}`,
      `- 分类：${text(record.category)}；可见范围：${text(record.visibility)}；渠道：${text(record.channel)}`,
      `- 版本：${text(record.version)}；技术审核责任人：${text(record.technical_reviewer)}`,
      `- 送审前待补：${formatMissing(assessment)}`,
      `- 人工升级说明：${text(record.escalation_guidance)}`,
      '',
      '排障步骤：',
      formatSteps(record.troubleshooting_steps),
      ''
    );
  }
  return `${lines.join('\n')}\n`;
}
