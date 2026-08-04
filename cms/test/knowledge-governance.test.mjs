import assert from 'node:assert/strict';
import test from 'node:test';

const { KnowledgeGovernanceError, assertKnowledgeLifecycleReadiness } = await import('../content-workflow/knowledge-governance.mjs');

const completeKnowledge = Object.freeze({
  source_key: 'faq-example-001',
  source_document: 'FAQ/Dify知识库.zip::机械问题.csv',
  category: 'mechanical_fault',
  question_title: '导轮异响如何检查？',
  troubleshooting_steps: [{ type: 'step', content: '确认设备已停止运行。' }],
  risk_level: 'medium',
  version: 'technical-review-1',
  technical_reviewer: 'tech-reviewer-1',
  visibility: 'public',
  channel: 'both'
});

test('incomplete knowledge drafts remain editable but cannot enter technical review', () => {
  assert.doesNotThrow(() => assertKnowledgeLifecycleReadiness({
    current: { status: 'draft', publication_state: 'unpublished' }, input: { question_title: 'Imported source title' }, target: 'draft'
  }));
  assert.throws(() => assertKnowledgeLifecycleReadiness({
    current: { status: 'draft', publication_state: 'unpublished' }, input: { status: 'review', question_title: 'Imported source title' }, target: 'review'
  }), (error) => error instanceof KnowledgeGovernanceError
    && error.code === 'KNOWLEDGE_REVIEW_REQUIRED_FIELDS'
    && error.missing.includes('source_key')
    && error.missing.includes('technical_reviewer'));
});

test('high-risk knowledge needs explicit safety preconditions and escalation guidance before review', () => {
  assert.throws(() => assertKnowledgeLifecycleReadiness({
    current: { ...completeKnowledge, risk_level: 'high' }, input: { status: 'review' }, target: 'review'
  }), (error) => error instanceof KnowledgeGovernanceError && error.code === 'KNOWLEDGE_HIGH_RISK_SAFETY');

  assert.doesNotThrow(() => assertKnowledgeLifecycleReadiness({
    current: { ...completeKnowledge, risk_level: 'high', safety_preconditions: ['断电并确认运动部件完全停止'], escalation_guidance: '无法确认安全状态时联系售后技术人员。' },
    input: { status: 'review' }, target: 'review'
  }));
});

test('only public knowledge may be published, while internal knowledge remains reviewable', () => {
  assert.doesNotThrow(() => assertKnowledgeLifecycleReadiness({
    current: { ...completeKnowledge, visibility: 'support_internal' }, input: { status: 'review' }, target: 'review'
  }));
  assert.throws(() => assertKnowledgeLifecycleReadiness({
    current: { ...completeKnowledge, visibility: 'support_internal', status: 'scheduled', publication_state: 'unpublished' },
    input: { status: 'published' }, target: 'published'
  }), (error) => error instanceof KnowledgeGovernanceError && error.code === 'KNOWLEDGE_PUBLIC_VISIBILITY_REQUIRED');
});
