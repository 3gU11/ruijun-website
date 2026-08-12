import { assessKnowledgeLifecycleReadiness } from '../../../content-workflow/knowledge-governance.mjs';

const allowedRoles = new Set(['审核管理', '只读管理人员', '内容编辑']);
const contentCollections = Object.freeze([
  ['pages', '页面'],
  ['site_settings', '全站设置'],
  ['product_series', '产品系列'],
  ['product_models', '产品型号'],
  ['product_parameters', '产品参数'],
  ['case_studies', '客户案例'],
  ['manufacturing_evidence', '制造证据'],
  ['qualifications', '资质证书'],
  ['milestones', '企业历程'],
  ['service_resources', '服务资料'],
  ['service_locations', '服务网点'],
  ['external_service_entries', '售后入口'],
  ['knowledge_items', 'FAQ 知识'],
  ['articles', '新闻文章'],
  ['media_assets', '公共媒体']
]);

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function json(value, fallback) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

async function publisherActor(database, accountability) {
  if (!accountability?.user) return null;
  if (accountability.admin) return { id: accountability.user };
  const role = accountability.role ? await database('directus_roles').where({ id: accountability.role }).first() : null;
  return allowedRoles.has(role?.name) ? { id: accountability.user } : null;
}

async function rows(database, collection, fields) {
  const result = await database(collection).select(fields);
  return Array.isArray(result) ? result : [];
}

function summarizeCollection(key, label, entries) {
  const counts = { total: entries.length, draft: 0, review: 0, scheduled: 0, published: 0, unpublished: 0, archived: 0 };
  for (const entry of entries) {
    const status = text(entry.status) || 'unknown';
    if (Object.hasOwn(counts, status)) counts[status] += 1;
  }
  return {
    key,
    label,
    ...counts,
    attention: counts.draft + counts.review + counts.unpublished,
    edit_path: `/admin/content/${encodeURIComponent(key)}`
  };
}

function summarizeKnowledge(entries) {
  const items = entries.map((entry) => {
    const assessment = assessKnowledgeLifecycleReadiness({
      current: {
        ...entry,
        troubleshooting_steps: json(entry.troubleshooting_steps, []),
        safety_preconditions: json(entry.safety_preconditions, [])
      },
      target: 'review'
    });
    return {
      risk: text(entry.risk_level).toLowerCase() || 'unknown',
      ready: assessment.missing.length === 0 && !assessment.requiresHighRiskSafety,
      status: text(entry.status) || 'unknown',
      visibility: text(entry.visibility) || 'unknown'
    };
  });
  return {
    total: items.length,
    high_risk: items.filter((item) => item.risk === 'high').length,
    blocked: items.filter((item) => !item.ready).length,
    ready_for_review: items.filter((item) => item.ready).length,
    public_candidates: items.filter((item) => item.visibility === 'public').length,
    draft: items.filter((item) => item.status === 'draft').length
  };
}

export function registerOperationsOverviewEndpoint(router, { database }) {
  router.get('/', async (req, res, next) => {
    try {
      const actor = await publisherActor(database, req.accountability);
      if (!actor) return res.status(403).json({ errors: [{ message: 'Only CMS business roles may view operations overview' }] });
      const selected = await Promise.all(contentCollections.map(async ([key, label]) => {
        const fields = key === 'knowledge_items'
          ? ['id', 'status', 'publication_state', 'risk_level', 'visibility', 'troubleshooting_steps', 'safety_preconditions']
          : ['id', 'status', 'publication_state'];
        return { key, label, entries: await rows(database, key, fields) };
      }));
      const collections = selected.map(({ key, label, entries }) => summarizeCollection(key, label, entries));
      const knowledge = summarizeKnowledge(selected.find((item) => item.key === 'knowledge_items')?.entries || []);
      const summary = {
        total_records: collections.reduce((total, item) => total + item.total, 0),
        attention_records: collections.reduce((total, item) => total + item.attention, 0),
        published_records: collections.reduce((total, item) => total + item.published, 0),
        collections_with_attention: collections.filter((item) => item.attention > 0).length
      };
      return res.status(200).json({
        data: {
          summary,
          knowledge,
          collections,
          quick_links: [
            { label: '内容编辑', path: '/admin/ruijun-content-editor-workbench' },
            { label: '发布就绪', path: '/admin/ruijun-publication-readiness-workbench' },
            { label: '内容发布队列', path: '/admin/ruijun-content-publication-queue-workbench' },
            { label: '产品统一发布', path: '/admin/ruijun-product-release-workbench' },
            { label: '常见问题审核', path: '/admin/ruijun-knowledge-review-workbench' },
            { label: '内容版本', path: '/admin/ruijun-content-version-manager' }
          ]
        }
      });
    } catch (error) {
      return next(error);
    }
  });
}

export default {
  id: 'operations-overview',
  handler(router, context) {
    registerOperationsOverviewEndpoint(router, context);
  }
};
