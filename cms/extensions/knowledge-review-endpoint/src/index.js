import { assessKnowledgeLifecycleReadiness } from '../../../content-workflow/knowledge-governance.mjs';

const allowedRoles = new Set(['技术审核人员', '发布人员']);
const missingLabels = Object.freeze({
  source_key: '来源键',
  source_document: '来源文档',
  category: '分类',
  question_title: '问题标题',
  risk_level: '风险等级',
  version: '版本',
  technical_reviewer: '技术审核责任人',
  visibility: '可见范围',
  channel: '渠道',
  troubleshooting_steps: '排障步骤'
});
const riskOrder = Object.freeze({ high: 0, medium: 1, low: 2, unknown: 3 });

function text(value) {
  return typeof value === 'string' ? value.normalize('NFKC').trim() : '';
}

function json(value, fallback) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

async function reviewerActor(database, accountability) {
  if (!accountability?.user) return null;
  if (accountability.admin) return { id: accountability.user };
  const role = accountability.role ? await database('directus_roles').where({ id: accountability.role }).first() : null;
  return allowedRoles.has(role?.name) ? { id: accountability.user } : null;
}

function normalizeRisk(value) {
  const risk = text(value).toLowerCase();
  return Object.hasOwn(riskOrder, risk) ? risk : 'unknown';
}

function reviewItem(item) {
  const normalized = {
    ...item,
    troubleshooting_steps: json(item.troubleshooting_steps, []),
    safety_preconditions: json(item.safety_preconditions, [])
  };
  const assessment = assessKnowledgeLifecycleReadiness({ current: normalized, target: 'review' });
  const missing = assessment.missing.map((field) => missingLabels[field] || field);
  if (assessment.requiresHighRiskSafety) missing.push('高风险安全前置条件与人工升级说明');
  const risk = normalizeRisk(item.risk_level);
  const result = {
    id: item.id,
    title: text(item.question_title) || '未命名知识',
    category: text(item.category) || '未分类',
    risk,
    visibility: text(item.visibility) || '未填写',
    channel: text(item.channel) || '未填写',
    status: text(item.status) || '未知',
    publication_state: text(item.publication_state) || '未知',
    missing,
    ready_for_review: missing.length === 0
  };
  if (item.id != null) result.edit_path = '/admin/content/knowledge_items/' + encodeURIComponent(String(item.id));
  return result;
}

export function registerKnowledgeReviewEndpoint(router, { database }) {
  router.get('/', async (req, res, next) => {
    try {
      const actor = await reviewerActor(database, req.accountability);
      if (!actor) return res.status(403).json({ errors: [{ message: 'Only knowledge reviewers may view FAQ review data' }] });
      const rows = await database('knowledge_items').select([
        'id', 'question_title', 'category', 'risk_level', 'visibility', 'channel',
        'troubleshooting_steps', 'safety_preconditions', 'escalation_guidance',
        'source_key', 'source_document', 'version', 'technical_reviewer', 'status', 'publication_state'
      ]);
      const items = (Array.isArray(rows) ? rows : []).map(reviewItem).sort((left, right) => (
        (riskOrder[left.risk] ?? 3) - (riskOrder[right.risk] ?? 3)
        || left.title.localeCompare(right.title, 'zh-CN')
        || String(left.id).localeCompare(String(right.id))
      ));
      const summary = {
        total: items.length,
        blocked: items.filter((item) => !item.ready_for_review).length,
        ready_for_review: items.filter((item) => item.ready_for_review).length,
        high_risk: items.filter((item) => item.risk === 'high').length,
        public: items.filter((item) => item.visibility === 'public').length
      };
      return res.status(200).json({ data: { summary, items } });
    } catch (error) {
      return next(error);
    }
  });
}

export default {
  id: 'knowledge-review',
  handler(router, context) {
    registerKnowledgeReviewEndpoint(router, context);
  }
};
