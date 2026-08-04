import { reviewerRoleForMediaUsageScope } from './media-asset-governance.mjs';
import { KnowledgeGovernanceError, assertKnowledgeLifecycleReadiness } from './knowledge-governance.mjs';

const reviewerScopes = Object.freeze({
  technical_reviewer: new Set(['product_series', 'product_models', 'product_parameters', 'service_resources', 'knowledge_items']),
  brand_reviewer: new Set(['pages', 'articles', 'case_studies', 'manufacturing_evidence', 'qualifications', 'milestones', 'service_locations', 'external_service_entries', 'site_settings'])
});

const finalStatuses = new Set(['archived']);
const controlledFields = new Set(['status', 'publication_state', 'published_at', 'reviewed_by', 'reviewed_at', 'published_by', 'publication_log']);

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
  return Object.fromEntries(Object.entries(input).filter(([key]) => !controlledFields.has(key)));
}

function audit(current, action, actor, timestamp, changedFields) {
  return [...activityLog(current.publication_log), {
    action, actor, at: timestamp.toISOString(), ...(changedFields.length ? { changed_fields: changedFields.slice(0, 30) } : {})
  }];
}

function validActor(actor) {
  const id = text(actor?.id, 128);
  const role = text(actor?.role, 64);
  if (!id || !role) throw new ContentPublicationError('ACTOR_REQUIRED', 'An authenticated content role is required');
  return { id, role };
}

function reviewerCanHandle(role, collection, current, input) {
  if (collection === 'media_assets') {
    const usageScope = input?.usage_scope ?? current?.usage_scope;
    try {
      return reviewerRoleForMediaUsageScope(usageScope) === role;
    } catch {
      return false;
    }
  }
  return reviewerScopes[role]?.has(collection);
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

export function applyContentPublicationUpdate({ collection, current, input, actor, now = () => new Date() }) {
  const existing = current && typeof current === 'object' ? current : null;
  const payload = input && typeof input === 'object' ? input : {};
  const actorInfo = validActor(actor);
  if (!collection || !existing || typeof existing.status !== 'string') throw new ContentPublicationError('CONTENT_NOT_FOUND', 'The content record is unavailable');
  if (finalStatuses.has(existing.status)) throw new ContentPublicationError('FINALIZED_CONTENT', 'Archived content cannot be changed through this workflow');
  const timestamp = now();
  if (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime())) throw new TypeError('now must return a valid Date');

  const target = Object.hasOwn(payload, 'status') ? text(payload.status, 64) : existing.status;
  const content = safePayload(payload);
  const changedFields = Object.keys(content).filter((key) => key !== 'review_note').sort();
  const base = { ...content };
  const unpublished = { publication_state: 'unpublished', published_at: null };

  if (actorInfo.role === 'system_admin' && (!Object.hasOwn(payload, 'status') || target === existing.status)) {
    return {
      ...base,
      status: existing.status,
      publication_state: existing.publication_state,
      published_at: existing.published_at ?? null,
      publication_log: audit(existing, 'content_updated', actorInfo.id, timestamp, changedFields)
    };
  }

  if (actorInfo.role === 'content_editor') {
    if (existing.status === 'draft' && target === 'draft') {
      return { ...base, status: 'draft', ...unpublished, publication_log: audit(existing, 'draft_updated', actorInfo.id, timestamp, changedFields) };
    }
    if (existing.status === 'draft' && target === 'review') {
      assertKnowledgeReadiness(collection, existing, payload, target);
      return { ...base, status: 'review', ...unpublished, publication_log: audit(existing, 'submitted_for_review', actorInfo.id, timestamp, changedFields) };
    }
    if ((existing.status === 'rejected' || existing.status === 'unpublished') && target === 'draft') {
      return { ...base, status: 'draft', ...unpublished, publication_log: audit(existing, 'reopened_as_draft', actorInfo.id, timestamp, changedFields) };
    }
    throw new ContentPublicationError('INVALID_TRANSITION', 'Editors may only edit drafts or submit drafts for review');
  }

  if (actorInfo.role === 'technical_reviewer' || actorInfo.role === 'brand_reviewer') {
    if (!reviewerCanHandle(actorInfo.role, collection, existing, payload)) throw new ContentPublicationError('ROLE_SCOPE', 'This reviewer role cannot review this content type');
    if (existing.status !== 'review' || !['scheduled', 'rejected'].includes(target)) {
      throw new ContentPublicationError('INVALID_TRANSITION', 'Reviewers may only approve or reject content awaiting review');
    }
    if (target === 'scheduled') assertKnowledgeReadiness(collection, existing, payload, target);
    const action = target === 'scheduled' ? 'approved_for_publication' : 'rejected';
    return {
      ...base, status: target, ...unpublished, reviewed_by: actorInfo.id, reviewed_at: timestamp.toISOString(),
      publication_log: audit(existing, action, actorInfo.id, timestamp, changedFields)
    };
  }

  if (actorInfo.role === 'publisher' || actorInfo.role === 'system_admin') {
    if (existing.status === 'scheduled' && target === 'published') {
      assertKnowledgeReadiness(collection, existing, payload, target);
      return {
        ...base, status: 'published', publication_state: 'published', published_at: timestamp.toISOString(), published_by: actorInfo.id,
        publication_log: audit(existing, 'published', actorInfo.id, timestamp, changedFields)
      };
    }
    if (existing.status === 'published' && target === 'unpublished') {
      return { ...base, status: 'unpublished', ...unpublished, publication_log: audit(existing, 'unpublished', actorInfo.id, timestamp, changedFields) };
    }
    if (existing.status === 'unpublished' && target === 'archived') {
      return { ...base, status: 'archived', ...unpublished, publication_log: audit(existing, 'archived', actorInfo.id, timestamp, changedFields) };
    }
    throw new ContentPublicationError('INVALID_TRANSITION', 'Publishers may publish approved content, unpublish it, or archive withdrawn content');
  }

  throw new ContentPublicationError('ROLE_SCOPE', 'This role cannot change publication state');
}

export function applyContentPublicationCreate({ collection, input, actor, now = () => new Date() }) {
  const payload = input && typeof input === 'object' ? input : {};
  const actorInfo = validActor(actor);
  if (!publicationWorkflowCollections.includes(collection)) throw new ContentPublicationError('CONTENT_NOT_FOUND', 'The content collection is unavailable');
  if (!['content_editor', 'system_admin'].includes(actor?.role)) {
    throw new ContentPublicationError('ROLE_SCOPE', 'This role cannot create publishable content');
  }
  const timestamp = now();
  if (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime())) throw new TypeError('now must return a valid Date');
  const content = safePayload(payload);
  const changedFields = Object.keys(content).filter((key) => key !== 'review_note').sort();
  return {
    ...content, status: 'draft', publication_state: 'unpublished', published_at: null,
    publication_log: [{ action: 'created_as_draft', actor: actorInfo.id, at: timestamp.toISOString(), ...(changedFields.length ? { changed_fields: changedFields.slice(0, 30) } : {}) }]
  };
}

export const publicationWorkflowCollections = Object.freeze([
  'pages', 'product_series', 'product_models', 'product_parameters', 'case_studies', 'articles', 'manufacturing_evidence',
  'qualifications', 'milestones', 'service_resources', 'service_locations', 'knowledge_items', 'external_service_entries', 'media_assets', 'site_settings'
]);
