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
    collection: 'articles', input: { title: 'New article' }, actor: { role: 'review_manager', id: 'review-1' }, now
  }), (error) => error instanceof ContentPublicationError && error.code === 'ROLE_SCOPE');
});

test('content editors may create media assets as unpublished drafts for later review', () => {
  const created = applyContentPublicationCreate({
    collection: 'media_assets',
    input: {
      file_id: 'file-1', original_file_name: 'hero.png', mime_type: 'image/png', byte_size: 10,
      usage_scope: 'homepage', media_type: 'image', placement_key: 'home.hero', enabled: true,
      copyright_status: 'owned', status: 'published', publication_state: 'published'
    },
    actor: { role: 'content_editor', id: 'editor-1' }, now
  });
  assert.equal(created.status, 'draft');
  assert.equal(created.publication_state, 'unpublished');
  assert.equal(created.published_at, null);
  assert.equal(created.file_id, 'file-1');
});

test('content editors may create product model drafts used by the visual product editor', () => {
  const created = applyContentPublicationCreate({
    collection: 'product_models',
    input: { series_code: 'FL', model_code: 'FL1180', name: 'E2E 产品型号', status: 'published', publication_state: 'published' },
    actor: { role: 'content_editor', id: 'editor-1' }, now
  });
  assert.equal(created.status, 'draft');
  assert.equal(created.publication_state, 'unpublished');
  assert.equal(created.model_code, 'FL1180');
});

test('system management reviews and publishes technical content', () => {
  const reviewingModel = {
    status: 'review', publication_state: 'unpublished', publication_log: '[]', name: 'FR400XS', model_code: 'FR400XS',
    series_code: 'FR-XS', source_document: 'catalog.pdf', parameters: { travel: '400mm' }, import_evidence: {}
  };
  const approved = applyContentPublicationUpdate({
    collection: 'product_models', current: reviewingModel,
    input: { status: 'scheduled', review_note: 'Parameters verified.' }, actor: { role: 'system_admin', id: 'admin-1' }, now
  });
  assert.equal(approved.status, 'scheduled');
  assert.equal(approved.reviewed_by, 'admin-1');
  assert.equal(approved.publication_log.at(-1).action, 'approved_for_publication');

  const published = applyContentPublicationUpdate({
    collection: 'product_models', current: { ...reviewingModel, ...approved, publication_log: approved.publication_log }, input: { status: 'published' },
    actor: { role: 'system_admin', id: 'admin-1' }, now
  });
  assert.equal(published.status, 'published');
  assert.equal(published.publication_state, 'published');
  assert.equal(published.published_by, 'admin-1');
  assert.equal(published.publication_log.at(-1).action, 'published');

  const unpublished = applyContentPublicationUpdate({
    collection: 'product_models', current: { ...published, publication_log: published.publication_log }, input: { status: 'unpublished', review_note: 'Temporarily withdrawn.' },
    actor: { role: 'system_admin', id: 'admin-1' }, now
  });
  assert.equal(unpublished.status, 'unpublished');
  assert.equal(unpublished.publication_state, 'unpublished');
  assert.equal(unpublished.published_at, null);
  assert.equal(unpublished.publication_log.at(-1).action, 'unpublished');
});

test('system management cannot bypass final readiness blockers on incomplete content', () => {
  assert.throws(() => applyContentPublicationUpdate({
    collection: 'product_parameters',
    current: { status: 'scheduled', publication_state: 'unpublished', model_code: 'FR400XS', field_name: '行程', value: '400' },
    input: { status: 'published' }, actor: { role: 'system_admin', id: 'admin-1' }, now
  }), (error) => error instanceof ContentPublicationError
    && error.code === 'CONTENT_NOT_READY'
    && /来源文件或地址/.test(error.message));

  assert.throws(() => applyContentPublicationUpdate({
    collection: 'media_assets',
    current: { status: 'scheduled', publication_state: 'unpublished', copyright_status: 'pending_review' },
    input: { status: 'published' }, actor: { role: 'system_admin', id: 'admin-1' }, now
  }), (error) => error instanceof ContentPublicationError
    && error.code === 'CONTENT_NOT_READY'
    && /版权状态待审核/.test(error.message));
});

test('review management and system management cannot mutate content inside lifecycle transitions', () => {
  assert.throws(() => applyContentPublicationUpdate({
    collection: 'product_models',
    current: { status: 'review', publication_state: 'unpublished' },
    input: { status: 'scheduled', parameters: { travel: 'forged' } },
    actor: { role: 'system_admin', id: 'admin-1' }, now
  }), (error) => error instanceof ContentPublicationError && error.code === 'CONTENT_MUTATION_FORBIDDEN');

  assert.throws(() => applyContentPublicationUpdate({
    collection: 'pages',
    current: { status: 'scheduled', publication_state: 'unpublished', slug: 'home', title: '已审核标题', language: 'zh-CN', sections: [{ id: 'hero' }], seo: { title: '首页' }, source_document: 'home.md' },
    input: { status: 'published', title: '发布时篡改标题' },
    actor: { role: 'review_manager', id: 'review-1' }, now
  }), (error) => error instanceof ContentPublicationError && error.code === 'CONTENT_MUTATION_FORBIDDEN');
});

test('final readiness accepts complete JSON fields returned as database strings', () => {
  const published = applyContentPublicationUpdate({
    collection: 'pages',
    current: {
      status: 'scheduled', publication_state: 'unpublished', slug: 'home', title: '首页', language: 'zh-CN',
      sections: '[{"id":"hero"}]', seo: '{"title":"首页"}', source_document: 'home.md'
    },
    input: { status: 'published' }, actor: { role: 'review_manager', id: 'review-1' }, now
  });
  assert.equal(published.status, 'published');
  assert.equal(published.publication_state, 'published');
});

test('reviewer scope and final states are enforced by the server workflow', () => {
  const approved = applyContentPublicationUpdate({
    collection: 'product_models', current: { status: 'review', publication_state: 'unpublished' }, input: { status: 'scheduled' },
    actor: { role: 'review_manager', id: 'review-1' }, now
  });
  assert.equal(approved.status, 'scheduled');
  assert.throws(() => applyContentPublicationUpdate({
    collection: 'articles', current: { status: 'archived', publication_state: 'unpublished' }, input: { status: 'draft' },
    actor: { role: 'content_editor', id: 'editor-1' }, now
  }), (error) => error instanceof ContentPublicationError && error.code === 'FINALIZED_CONTENT');
});

test('unified review management may approve governed media assets', () => {
  const technicalApproval = applyContentPublicationUpdate({
    collection: 'media_assets',
    current: { status: 'review', publication_state: 'unpublished', usage_scope: 'product', publication_log: [] },
    input: { status: 'scheduled' }, actor: { role: 'system_admin', id: 'admin-1' }, now
  });
  assert.equal(technicalApproval.status, 'scheduled');

  const brandApproval = applyContentPublicationUpdate({
    collection: 'media_assets',
    current: { status: 'review', publication_state: 'unpublished', usage_scope: 'qualification', publication_log: [] },
    input: { status: 'scheduled' }, actor: { role: 'review_manager', id: 'review-1' }, now
  });
  assert.equal(brandApproval.status, 'scheduled');
});
