import assert from 'node:assert/strict';
import test from 'node:test';

const { ContentPublicationError, applyContentPublicationCreate, applyContentPublicationUpdate } = await import('../content-workflow/content-publication-workflow.mjs');

const now = () => new Date('2026-08-01T09:00:00.000Z');

test('content editor can submit a draft for review but cannot self-publish', () => {
  const submitted = applyContentPublicationUpdate({
    collection: 'pages', current: { status: 'draft', publication_state: 'unpublished', publication_log: [] },
    input: { title: 'Updated content', status: 'review', publication_state: 'published', publication_log: [{ action: 'forged' }] },
    actor: { role: 'content_editor', id: 'editor-1' }, now
  });

  assert.deepEqual(submitted, {
    title: 'Updated content', status: 'review', publication_state: 'unpublished', published_at: null,
    publication_log: [{ action: 'submitted_for_review', actor: 'editor-1', at: '2026-08-01T09:00:00.000Z', changed_fields: ['title'] }]
  });
  assert.throws(() => applyContentPublicationUpdate({
    collection: 'pages', current: { status: 'draft', publication_state: 'unpublished' }, input: { status: 'published' },
    actor: { role: 'content_editor', id: 'editor-1' }, now
  }), (error) => error instanceof ContentPublicationError && error.code === 'INVALID_TRANSITION');
});

test('content workflow applies knowledge governance before a draft enters review', () => {
  assert.throws(() => applyContentPublicationUpdate({
    collection: 'knowledge_items',
    current: { status: 'draft', publication_state: 'unpublished', publication_log: [], question_title: 'Imported FAQ' },
    input: { status: 'review' }, actor: { role: 'content_editor', id: 'editor-1' }, now
  }), (error) => error instanceof ContentPublicationError && error.code === 'KNOWLEDGE_REVIEW_REQUIRED_FIELDS');
});

test('system administrator may update draft content without requesting a lifecycle transition', () => {
  const updated = applyContentPublicationUpdate({
    collection: 'knowledge_items',
    current: { status: 'draft', publication_state: 'unpublished', publication_log: [] },
    input: { question_title: 'Imported FAQ title', visibility: 'support_internal' },
    actor: { role: 'system_admin', id: 'admin-1' }, now
  });

  assert.deepEqual(updated, {
    question_title: 'Imported FAQ title', visibility: 'support_internal',
    status: 'draft', publication_state: 'unpublished', published_at: null,
    publication_log: [{ action: 'content_updated', actor: 'admin-1', at: '2026-08-01T09:00:00.000Z', changed_fields: ['question_title', 'visibility'] }]
  });
  assert.throws(() => applyContentPublicationUpdate({
    collection: 'knowledge_items', current: { status: 'draft', publication_state: 'unpublished', publication_log: [] },
    input: { status: 'published' }, actor: { role: 'system_admin', id: 'admin-1' }, now
  }), (error) => error instanceof ContentPublicationError && error.code === 'INVALID_TRANSITION');
});

test('only content editors may create publishable records and creation always starts as a draft', () => {
  assert.deepEqual(applyContentPublicationCreate({
    collection: 'articles', input: { title: 'New article', status: 'published', publication_state: 'published', publication_log: [{ action: 'forged' }] },
    actor: { role: 'content_editor', id: 'editor-1' }, now
  }), {
    title: 'New article', status: 'draft', publication_state: 'unpublished', published_at: null,
    publication_log: [{ action: 'created_as_draft', actor: 'editor-1', at: '2026-08-01T09:00:00.000Z', changed_fields: ['title'] }]
  });
  assert.throws(() => applyContentPublicationCreate({
    collection: 'articles', input: { title: 'New article' }, actor: { role: 'publisher', id: 'publisher-1' }, now
  }), (error) => error instanceof ContentPublicationError && error.code === 'ROLE_SCOPE');
});

test('the designated reviewer approves applicable content and publisher controls publication and unpublication', () => {
  const approved = applyContentPublicationUpdate({
    collection: 'product_models', current: { status: 'review', publication_state: 'unpublished', publication_log: '[]' },
    input: { status: 'scheduled', review_note: 'Parameters verified.' }, actor: { role: 'technical_reviewer', id: 'tech-1' }, now
  });
  assert.equal(approved.status, 'scheduled');
  assert.equal(approved.reviewed_by, 'tech-1');
  assert.equal(approved.publication_log.at(-1).action, 'approved_for_publication');

  const published = applyContentPublicationUpdate({
    collection: 'product_models', current: { ...approved, publication_log: approved.publication_log }, input: { status: 'published' },
    actor: { role: 'publisher', id: 'publisher-1' }, now
  });
  assert.equal(published.status, 'published');
  assert.equal(published.publication_state, 'published');
  assert.equal(published.published_by, 'publisher-1');
  assert.equal(published.publication_log.at(-1).action, 'published');

  const unpublished = applyContentPublicationUpdate({
    collection: 'product_models', current: { ...published, publication_log: published.publication_log }, input: { status: 'unpublished', review_note: 'Temporarily withdrawn.' },
    actor: { role: 'publisher', id: 'publisher-1' }, now
  });
  assert.equal(unpublished.status, 'unpublished');
  assert.equal(unpublished.publication_state, 'unpublished');
  assert.equal(unpublished.published_at, null);
  assert.equal(unpublished.publication_log.at(-1).action, 'unpublished');
});

test('reviewer scope and final states are enforced by the server workflow', () => {
  assert.throws(() => applyContentPublicationUpdate({
    collection: 'pages', current: { status: 'review', publication_state: 'unpublished' }, input: { status: 'scheduled' },
    actor: { role: 'technical_reviewer', id: 'tech-1' }, now
  }), (error) => error instanceof ContentPublicationError && error.code === 'ROLE_SCOPE');
  assert.throws(() => applyContentPublicationUpdate({
    collection: 'articles', current: { status: 'archived', publication_state: 'unpublished' }, input: { status: 'draft' },
    actor: { role: 'content_editor', id: 'editor-1' }, now
  }), (error) => error instanceof ContentPublicationError && error.code === 'FINALIZED_CONTENT');
});

test('media assets are reviewed by the corresponding technical or brand reviewer before publication', () => {
  const technicalApproval = applyContentPublicationUpdate({
    collection: 'media_assets',
    current: { status: 'review', publication_state: 'unpublished', usage_scope: 'product', publication_log: [] },
    input: { status: 'scheduled' }, actor: { role: 'technical_reviewer', id: 'tech-1' }, now
  });
  assert.equal(technicalApproval.status, 'scheduled');

  assert.throws(() => applyContentPublicationUpdate({
    collection: 'media_assets',
    current: { status: 'review', publication_state: 'unpublished', usage_scope: 'qualification', publication_log: [] },
    input: { status: 'scheduled' }, actor: { role: 'technical_reviewer', id: 'tech-1' }, now
  }), (error) => error instanceof ContentPublicationError && error.code === 'ROLE_SCOPE');
});
