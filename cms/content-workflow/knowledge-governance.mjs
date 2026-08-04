function text(value, maximum = 500) {
  return typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, maximum) : '';
}

function arrayValue(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasSteps(value) {
  return arrayValue(value).some((step) => {
    if (typeof step === 'string') return Boolean(text(step));
    return step && typeof step === 'object' && Boolean(text(step.content));
  });
}

function hasItems(value) {
  return arrayValue(value).some((item) => Boolean(text(typeof item === 'string' ? item : item?.content)));
}

export class KnowledgeGovernanceError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = 'KnowledgeGovernanceError';
    this.code = code;
    Object.assign(this, options);
  }
}

export function assessKnowledgeLifecycleReadiness({ current, input, target = 'review' }) {
  if (!['review', 'scheduled', 'published'].includes(target)) return { missing: [], requiresHighRiskSafety: false, requiresPublicVisibility: false };
  const record = { ...(current || {}), ...(input || {}) };
  const required = [
    'source_key', 'source_document', 'category', 'question_title', 'risk_level', 'version', 'technical_reviewer', 'visibility', 'channel'
  ].filter((field) => !text(record[field]));
  if (!hasSteps(record.troubleshooting_steps)) required.push('troubleshooting_steps');
  const requiresHighRiskSafety = text(record.risk_level, 64).toLowerCase() === 'high'
    && (!hasItems(record.safety_preconditions) || !text(record.escalation_guidance));
  const requiresPublicVisibility = target === 'published' && text(record.visibility, 64) !== 'public';
  return { missing: required, requiresHighRiskSafety, requiresPublicVisibility };
}

export function assertKnowledgeLifecycleReadiness({ current, input, target }) {
  const assessment = assessKnowledgeLifecycleReadiness({ current, input, target });
  if (assessment.missing.length) {
    throw new KnowledgeGovernanceError(
      'KNOWLEDGE_REVIEW_REQUIRED_FIELDS',
      `Knowledge review requires: ${assessment.missing.join(', ')}`,
      { missing: assessment.missing }
    );
  }
  if (assessment.requiresHighRiskSafety) {
    throw new KnowledgeGovernanceError(
      'KNOWLEDGE_HIGH_RISK_SAFETY',
      'High-risk knowledge requires explicit safety preconditions and escalation guidance'
    );
  }
  if (assessment.requiresPublicVisibility) {
    throw new KnowledgeGovernanceError(
      'KNOWLEDGE_PUBLIC_VISIBILITY_REQUIRED',
      'Only knowledge marked public may be published'
    );
  }
}
