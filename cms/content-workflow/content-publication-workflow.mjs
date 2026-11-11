import { reviewerRoleForMediaUsageScope } from './media-asset-governance.mjs';
import { KnowledgeGovernanceError, assertKnowledgeLifecycleReadiness } from './knowledge-governance.mjs';
import { assessProductModel, assessProductSeries } from '../reports/product-review-rules.mjs';
import { assessPage, assessSiteSettings } from '../reports/publication-readiness-report.mjs';
import { assessArticle, assessCaseStudy, assessProductParameter, assessPublicKnowledge } from '../reports/public-content-review-rules.mjs';
import { assessServiceEntry, assessServiceLocation, assessServiceResource } from '../reports/service-content-review-report.mjs';
import { assessManufacturingEvidence, assessMilestone, assessQualification } from '../reports/website-evidence-review-rules.mjs';

const editorCollections = new Set([
  'pages', 'product_series', 'product_models', 'product_parameters', 'case_studies', 'articles',
  'manufacturing_evidence', 'qualifications', 'milestones', 'service_locations'
]);
const editorCreateCollections = new Set([...editorCollections, 'media_assets']);
const reviewManagerCollections = new Set([...editorCollections, 'media_assets']);

const finalStatuses = new Set(['archived']);
const controlledFields = new Set(['status', 'publication_state', 'published_at', 'reviewed_by', 'reviewed_at', 'published_by', 'publication_log']);
const transitionMetadataFields = new Set([...controlledFields, 'review_note', 'submission_name']);

export class ContentPublicationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ContentPublicationError';
    this.code = code;
  }
}

function text(value, maximum = 500) {
  return typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, maximum) : '';
}

function activityLog(value) {
  let entries = value;
  if (typeof value === 'string') {
    try {
      entries = JSON.parse(value);
    } catch {
      entries = [];
    }
  }
  return Array.isArray(entries) ? entries.filter((entry) => entry && typeof entry === 'object').slice(-199) : [];
}

function safePayload(input) {
  return Object.fromEntries(Object.entries(input).filter(([key]) => !controlledFields.has(key) && !transitionMetadataFields.has(key)));
}

function audit(current, action, actor, timestamp, changedFields, extra = {}) {
  return [...activityLog(current.publication_log), {
    action, actor, at: timestamp.toISOString(),
    ...(text(extra.submission_name) ? { submission_name: text(extra.submission_name, 160) } : {}),
    ...(changedFields.length ? { changed_fields: changedFields.slice(0, 30) } : {})
  }];
}

function validActor(actor) {
  const id = text(actor?.id, 128);
  const role = text(actor?.role, 64);
  if (!id || !role) throw new ContentPublicationError('ACTOR_REQUIRED', '需要已登录且具备内容权限的账号');
  return { id, role };
}

function reviewerCanHandle(role, collection, current, input) {
  if (role === 'system_admin') return true;
  if (role === 'review_manager') return reviewManagerCollections.has(collection);
  if (collection === 'media_assets') {
    const usageScope = input?.usage_scope ?? current?.usage_scope;
    try {
      return reviewerRoleForMediaUsageScope(usageScope) === role;
    } catch {
      return false;
    }
  }
  return false;
}

function assertKnowledgeReadiness(collection, current, input, target) {
  if (collection !== 'knowledge_items') return;
  try {
    assertKnowledgeLifecycleReadiness({ current, input, target });
  } catch (error) {
    if (error instanceof KnowledgeGovernanceError) throw new ContentPublicationError(error.code, error.message);
    throw error;
  }
}

function json(value, fallback) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function normalizeReadinessRecord(collection, value) {
  const record = { ...value };
  if (collection === 'product_series') record.import_evidence = json(record.import_evidence, {});
  if (collection === 'product_models') {
    record.parameters = json(record.parameters, {});
    record.import_evidence = json(record.import_evidence, {});
  }
  if (collection === 'manufacturing_evidence') record.media = json(record.media, []);
  if (collection === 'articles') record.media = json(record.media, []);
  if (collection === 'qualifications') record.assets = json(record.assets, []);
  if (collection === 'service_locations') record.contact = json(record.contact, {});
  if (collection === 'knowledge_items') {
    record.troubleshooting_steps = json(record.troubleshooting_steps, []);
    record.safety_preconditions = json(record.safety_preconditions, []);
  }
  if (collection === 'articles') record.seo = json(record.seo, {});
  if (collection === 'pages') {
    record.sections = json(record.sections, []);
    record.seo = json(record.seo, {});
  }
  if (collection === 'site_settings') {
    record.navigation = json(record.navigation, []);
    record.footer = json(record.footer, {});
    record.brand = json(record.brand, {});
    record.contacts = json(record.contacts, {});
  }
  return record;
}

function finalPublicationIssues(collection, value) {
  const record = normalizeReadinessRecord(collection, value);
  if (collection === 'pages') return assessPage(record);
  if (collection === 'product_series') return assessProductSeries(record);
  if (collection === 'product_models') return assessProductModel(record);
  if (collection === 'product_parameters') return assessProductParameter(record);
  if (collection === 'case_studies') return assessCaseStudy(record);
  if (collection === 'articles') return assessArticle(record);
  if (collection === 'manufacturing_evidence') return assessManufacturingEvidence(record);
  if (collection === 'qualifications') return assessQualification(record);
  if (collection === 'milestones') return assessMilestone(record);
  if (collection === 'service_resources') return assessServiceResource(record);
  if (collection === 'service_locations') return assessServiceLocation(record);
  if (collection === 'knowledge_items') return assessPublicKnowledge(record);
  if (collection === 'external_service_entries') return assessServiceEntry(record).issues;
  if (collection === 'media_assets') return record.copyright_status === 'pending_review' ? ['版权状态待审核'] : [];
  if (collection === 'site_settings') return assessSiteSettings(record);
  return [];
}

function assertFinalPublicationReadiness(collection, current, input) {
  const candidate = { ...current, ...input, status: 'published', publication_state: 'published' };
  const issues = [...new Set(finalPublicationIssues(collection, candidate))];
  if (issues.length) throw new ContentPublicationError('CONTENT_NOT_READY', `内容尚未达到发布条件：${issues.join('、')}`);
}

function assertTransitionDoesNotMutateContent(input) {
  const contentFields = Object.keys(input).filter((field) => !transitionMetadataFields.has(field));
  if (contentFields.length) {
    throw new ContentPublicationError('CONTENT_MUTATION_FORBIDDEN', `状态流转不能同时修改内容字段：${contentFields.sort().join('、')}`);
  }
}

function resolveContentPublicationUpdate({ collection, current, input, actor, now = () => new Date() }) {
  const existing = current && typeof current === 'object' ? current : null;
  const payload = input && typeof input === 'object' ? input : {};
  const actorInfo = validActor(actor);
  if (!collection || !existing || typeof existing.status !== 'string') throw new ContentPublicationError('CONTENT_NOT_FOUND', '找不到这条内容记录');
  if (finalStatuses.has(existing.status)) throw new ContentPublicationError('FINALIZED_CONTENT', '已归档的内容不能通过此流程修改');
  const timestamp = now();
  if (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime())) throw new TypeError('now must return a valid Date');

  const target = Object.hasOwn(payload, 'status') ? text(payload.status, 64) : existing.status;
  const content = safePayload(payload);
  const changedFields = Object.keys(content).filter((key) => key !== 'review_note').sort();
  const base = { ...content };
  const unpublished = { publication_state: 'unpublished', published_at: null };

  // 媒体素材不参与内容审核：上传即发布，编辑已发布素材也只更新内容字段，
  // 不再生成“新草稿”，否则运营改一次标题就会让官网图片/视频消失。
  if (collection === 'media_assets') {
    if (Object.hasOwn(payload, 'status') && target !== existing.status) {
      throw new ContentPublicationError('INVALID_TRANSITION', '媒体素材已取消审核，不再支持送审/发布状态流转');
    }
    return {
      ...base,
      status: existing.status,
      publication_state: existing.publication_state,
      published_at: existing.published_at ?? null,
      publication_log: audit(existing, 'content_updated', actorInfo.id, timestamp, changedFields, { submission_name: payload.submission_name })
    };
  }

  // Editing an already published record creates the next draft in place. The
  // public API continues serving the previous published snapshot until this
  // new draft completes review and publication.
  if (existing.status === 'published' && !Object.hasOwn(payload, 'status')) {
    if (actorInfo.role !== 'content_editor' && actorInfo.role !== 'system_admin') {
      throw new ContentPublicationError('ROLE_SCOPE', '当前角色不能编辑已发布内容');
    }
    return {
      ...base,
      status: 'draft',
      ...unpublished,
      publication_log: audit(existing, 'published_revision_started', actorInfo.id, timestamp, changedFields, { submission_name: payload.submission_name })
    };
  }

  if (actorInfo.role === 'system_admin' && (!Object.hasOwn(payload, 'status') || target === existing.status)) {
    return {
      ...base,
      status: existing.status,
      publication_state: existing.publication_state,
      published_at: existing.published_at ?? null,
      publication_log: audit(existing, 'content_updated', actorInfo.id, timestamp, changedFields, { submission_name: payload.submission_name })
    };
  }

  // An administrator may start the review process, but must not skip it: the
  // publish gate further down still applies. Without this an admin had no way
  // to submit anything, since `draft -> review` was editor-only.
  if (actorInfo.role === 'system_admin' && existing.status === 'draft' && target === 'review') {
    assertKnowledgeReadiness(collection, existing, payload, target);
    return {
      ...base, status: 'review', ...unpublished,
      publication_log: audit(existing, 'submitted_for_review', actorInfo.id, timestamp, changedFields, { submission_name: payload.submission_name })
    };
  }

  // Same reasoning as `draft -> review` above. Reopening withdrawn content moves
  // backwards, so it cannot shortcut the publish gate — the full
  // draft -> review -> scheduled -> published chain still applies. Without this,
  // an administrator could take a page down but never get it back to an editable
  // state, which left the only route back through a second account in the
  // 内容编辑 role. Editors keep the same ability below.
  if (actorInfo.role === 'system_admin' && (existing.status === 'rejected' || existing.status === 'unpublished') && target === 'draft') {
    return { ...base, status: 'draft', ...unpublished, publication_log: audit(existing, 'reopened_as_draft', actorInfo.id, timestamp, changedFields) };
  }

  if (actorInfo.role === 'content_editor') {
    if (existing.status === 'draft' && target === 'draft') {
      return { ...base, status: 'draft', ...unpublished, publication_log: audit(existing, 'draft_updated', actorInfo.id, timestamp, changedFields, { submission_name: payload.submission_name }) };
    }
    if (existing.status === 'draft' && target === 'review') {
      assertKnowledgeReadiness(collection, existing, payload, target);
      return { ...base, status: 'review', ...unpublished, publication_log: audit(existing, 'submitted_for_review', actorInfo.id, timestamp, changedFields, { submission_name: payload.submission_name }) };
    }
    if ((existing.status === 'rejected' || existing.status === 'unpublished') && target === 'draft') {
      return { ...base, status: 'draft', ...unpublished, publication_log: audit(existing, 'reopened_as_draft', actorInfo.id, timestamp, changedFields) };
    }
    throw new ContentPublicationError('INVALID_TRANSITION', '内容编辑只能编辑草稿，或把草稿提交审核');
  }

  if ((actorInfo.role === 'review_manager' || actorInfo.role === 'system_admin') && existing.status === 'review') {
    if (!reviewerCanHandle(actorInfo.role, collection, existing, payload)) throw new ContentPublicationError('ROLE_SCOPE', '当前审核角色不能审核这类内容');
    if (existing.status !== 'review' || !['scheduled', 'rejected'].includes(target)) {
      throw new ContentPublicationError('INVALID_TRANSITION', '审核人员只能批准或退回「审核中」的内容');
    }
    assertTransitionDoesNotMutateContent(payload);
    if (target === 'scheduled') {
      assertKnowledgeReadiness(collection, existing, payload, target);
      // Approval is the last moment a human looks at this content, and the record
      // freezes here — it can no longer be edited while it waits to be published.
      // Running the final gate now reports SEO/media gaps to the reviewer instead
      // of letting a page be approved and then fail at the publish button, where
      // the only way out is to send it all the way back.
      assertFinalPublicationReadiness(collection, existing, payload);
    }
    const action = target === 'scheduled' ? 'approved_for_publication' : 'rejected';
    return {
      ...base, status: target, ...unpublished, reviewed_by: actorInfo.id, reviewed_at: timestamp.toISOString(),
      publication_log: audit(existing, action, actorInfo.id, timestamp, changedFields)
    };
  }

  if (actorInfo.role === 'review_manager' || actorInfo.role === 'system_admin') {
    // Approved content can still be wrong. Without this, `scheduled` was a dead
    // end: the only route back to an editable draft was to publish the page
    // first, which is exactly what a reviewer wants to avoid. Content stays
    // frozen here, so the change is a pure lifecycle transition.
    if (existing.status === 'scheduled' && target === 'rejected') {
      assertTransitionDoesNotMutateContent(payload);
      return {
        ...base, status: 'rejected', ...unpublished, reviewed_by: actorInfo.id, reviewed_at: timestamp.toISOString(),
        publication_log: audit(existing, 'rejected', actorInfo.id, timestamp, changedFields)
      };
    }
    if (existing.status === 'scheduled' && target === 'published') {
      assertTransitionDoesNotMutateContent(payload);
      assertKnowledgeReadiness(collection, existing, payload, target);
      assertFinalPublicationReadiness(collection, existing, payload);
      return {
        ...base, status: 'published', publication_state: 'published', published_at: timestamp.toISOString(), published_by: actorInfo.id,
        publication_log: audit(existing, 'published', actorInfo.id, timestamp, changedFields)
      };
    }
    if (existing.status === 'published' && target === 'unpublished') {
      assertTransitionDoesNotMutateContent(payload);
      return { ...base, status: 'unpublished', ...unpublished, publication_log: audit(existing, 'unpublished', actorInfo.id, timestamp, changedFields) };
    }
    if (existing.status === 'unpublished' && target === 'archived') {
      assertTransitionDoesNotMutateContent(payload);
      return { ...base, status: 'archived', ...unpublished, publication_log: audit(existing, 'archived', actorInfo.id, timestamp, changedFields) };
    }
    throw new ContentPublicationError('INVALID_TRANSITION', '发布人员只能发布已批准的内容、下线已发布内容，或归档已撤回内容');
  }

  throw new ContentPublicationError('ROLE_SCOPE', '当前角色不能修改发布状态');
}

// `publication_state` is derived by the lifecycle and is never set directly.
//
// Two shapes must be told apart:
//   * a payload that carries a `status` transition may also carry a stale or
//     forged `publication_state` — it is ignored, and the transition decides.
//   * a payload that sets ONLY `publication_state` cannot take effect at all.
//     That used to return 200 while silently rewriting the value, which reads
//     as a successful publish. Reject it so the caller learns nothing happened.
export function applyContentPublicationUpdate(options) {
  const payload = options?.input && typeof options.input === 'object' ? options.input : {};
  if (Object.hasOwn(payload, 'publication_state') && !Object.hasOwn(payload, 'status')) {
    throw new ContentPublicationError(
      'PUBLICATION_STATE_DERIVED',
      'publication_state follows the content lifecycle and cannot be set on its own; request a status transition instead'
    );
  }
  return resolveContentPublicationUpdate(options);
}

export function applyContentPublicationCreate({ collection, input, actor, now = () => new Date() }) {
  const payload = input && typeof input === 'object' ? input : {};
  const actorInfo = validActor(actor);
  if (!publicationWorkflowCollections.includes(collection)) throw new ContentPublicationError('CONTENT_NOT_FOUND', '找不到内容所属的集合');
  if (!['content_editor', 'system_admin'].includes(actor?.role) || (actor?.role === 'content_editor' && !editorCreateCollections.has(collection))) {
    throw new ContentPublicationError('ROLE_SCOPE', '当前角色不能创建可发布的内容');
  }
  const timestamp = now();
  if (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime())) throw new TypeError('now must return a valid Date');
  const content = safePayload(payload);
  const changedFields = Object.keys(content).filter((key) => key !== 'review_note').sort();
  if (collection === 'media_assets') {
    // 媒体素材取消审核：上传成功即公开可用，避免内容引用被素材状态拦住。
    return {
      ...content, status: 'published', publication_state: 'published', published_at: timestamp.toISOString(),
      publication_log: [{ action: 'created_as_published', actor: actorInfo.id, at: timestamp.toISOString(), ...(changedFields.length ? { changed_fields: changedFields.slice(0, 30) } : {}) }]
    };
  }
  return {
    ...content, status: 'draft', publication_state: 'unpublished', published_at: null,
    publication_log: [{ action: 'created_as_draft', actor: actorInfo.id, at: timestamp.toISOString(), ...(changedFields.length ? { changed_fields: changedFields.slice(0, 30) } : {}) }]
  };
}

export const publicationWorkflowCollections = Object.freeze([
  'pages', 'product_series', 'product_models', 'product_parameters', 'case_studies', 'articles', 'manufacturing_evidence',
  'qualifications', 'milestones', 'service_resources', 'service_locations', 'knowledge_items', 'external_service_entries', 'media_assets', 'site_settings'
]);
