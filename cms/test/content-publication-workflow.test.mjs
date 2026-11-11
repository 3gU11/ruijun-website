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

test('content editors create media assets as published records without review', () => {
  const created = applyContentPublicationCreate({
    collection: 'media_assets',
    input: {
      file_id: 'file-1', original_file_name: 'hero.png', mime_type: 'image/png', byte_size: 10,
      usage_scope: 'homepage', media_type: 'image', placement_key: 'home.hero', enabled: true,
      copyright_status: 'owned', status: 'draft', publication_state: 'unpublished'
    },
    actor: { role: 'content_editor', id: 'editor-1' }, now
  });
  assert.equal(created.status, 'published');
  assert.equal(created.publication_state, 'published');
  assert.equal(created.published_at, now().toISOString());
  assert.equal(created.publication_log.at(-1).action, 'created_as_published');
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
    collection: 'product_models',
    current: { status: 'scheduled', publication_state: 'unpublished', model_code: 'FR400XS', series_code: 'fr-xs', parameters: {} },
    input: { status: 'published' }, actor: { role: 'system_admin', id: 'admin-1' }, now
  }), (error) => error instanceof ContentPublicationError
    && error.code === 'CONTENT_NOT_READY'
    && /结构化参数/.test(error.message));

  // 媒体素材已取消审核：不再走发布就绪检查，也不再接受状态流转。
  assert.throws(() => applyContentPublicationUpdate({
    collection: 'media_assets',
    current: { status: 'draft', publication_state: 'unpublished', copyright_status: 'pending_review' },
    input: { status: 'published' }, actor: { role: 'system_admin', id: 'admin-1' }, now
  }), (error) => error instanceof ContentPublicationError && error.code === 'INVALID_TRANSITION');
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
  // Approval runs the full publication gate, so the fixture has to be a record
  // that could actually go live.
  const approved = applyContentPublicationUpdate({
    collection: 'product_models',
    current: {
      status: 'review',
      publication_state: 'unpublished',
      model_code: 'FR400XS',
      series_code: 'fr-xs-auto',
      source_document: 'demo/product-catalog.md',
      parameters: { thickness: '400' }
    },
    input: { status: 'scheduled' },
    actor: { role: 'review_manager', id: 'review-1' }, now
  });
  assert.equal(approved.status, 'scheduled');
  assert.throws(() => applyContentPublicationUpdate({
    collection: 'articles', current: { status: 'archived', publication_state: 'unpublished' }, input: { status: 'draft' },
    actor: { role: 'content_editor', id: 'editor-1' }, now
  }), (error) => error instanceof ContentPublicationError && error.code === 'FINALIZED_CONTENT');
});

test('media assets no longer accept review approvals because review is cancelled', () => {
  assert.throws(() => applyContentPublicationUpdate({
    collection: 'media_assets',
    current: { status: 'review', publication_state: 'unpublished', usage_scope: 'product', publication_log: [] },
    input: { status: 'scheduled' }, actor: { role: 'system_admin', id: 'admin-1' }, now
  }), (error) => error instanceof ContentPublicationError && error.code === 'INVALID_TRANSITION');

  assert.throws(() => applyContentPublicationUpdate({
    collection: 'media_assets',
    current: { status: 'review', publication_state: 'unpublished', usage_scope: 'qualification', publication_log: [] },
    input: { status: 'scheduled' }, actor: { role: 'review_manager', id: 'review-1' }, now
  }), (error) => error instanceof ContentPublicationError && error.code === 'INVALID_TRANSITION');
});

test('setting publication_state alone is rejected instead of silently dropped', () => {
  // A caller that asks to publish by writing publication_state cannot succeed:
  // the state follows the lifecycle. It used to return 200 with the value
  // rewritten to 'unpublished', which reads as a successful publish.
  assert.throws(() => applyContentPublicationUpdate({
    collection: 'pages',
    current: { status: 'draft', publication_state: 'unpublished', publication_log: [] },
    input: { publication_state: 'published' },
    actor: { role: 'content_editor', id: 'editor-1' }, now
  }), (error) => error instanceof ContentPublicationError && error.code === 'PUBLICATION_STATE_DERIVED');

  // The same guard applies to a publisher, so nobody gets a false success.
  assert.throws(() => applyContentPublicationUpdate({
    collection: 'pages',
    current: { status: 'draft', publication_state: 'unpublished', publication_log: [] },
    input: { publication_state: 'published' },
    actor: { role: 'system_admin', id: 'admin-1' }, now
  }), (error) => error instanceof ContentPublicationError && error.code === 'PUBLICATION_STATE_DERIVED');
});

test('a lifecycle transition may still carry a stale publication_state', () => {
  // Forged or outdated values are neutralised rather than rejected, so the
  // transition itself decides the resulting state.
  const submitted = applyContentPublicationUpdate({
    collection: 'pages',
    current: { status: 'draft', publication_state: 'unpublished', publication_log: [] },
    input: { status: 'review', publication_state: 'published' },
    actor: { role: 'content_editor', id: 'editor-1' }, now
  });
  assert.equal(submitted.status, 'review');
  assert.equal(submitted.publication_state, 'unpublished');
});

test('an administrator can submit a draft for review but still cannot skip to published', () => {
  const submitted = applyContentPublicationUpdate({
    collection: 'pages',
    current: { status: 'draft', publication_state: 'unpublished', publication_log: [] },
    input: { status: 'review' }, actor: { role: 'system_admin', id: 'admin-1' }, now
  });
  assert.equal(submitted.status, 'review');
  assert.equal(submitted.publication_state, 'unpublished');
  assert.equal(submitted.publication_log.at(-1).action, 'submitted_for_review');

  // The publish gate is unchanged: only approved content may be published.
  assert.throws(() => applyContentPublicationUpdate({
    collection: 'pages',
    current: { status: 'draft', publication_state: 'unpublished', publication_log: [] },
    input: { status: 'published' }, actor: { role: 'system_admin', id: 'admin-1' }, now
  }), (error) => error instanceof ContentPublicationError && error.code === 'INVALID_TRANSITION');
});

test('an administrator can reopen withdrawn content as a draft', () => {
  // Taking a page down must not be a one-way door: without this the only route
  // back to an editable state was a second account in the 内容编辑 role, which a
  // single-administrator deployment does not have.
  for (const status of ['unpublished', 'rejected']) {
    const reopened = applyContentPublicationUpdate({
      collection: 'pages',
      current: { status, publication_state: 'unpublished', publication_log: [] },
      input: { status: 'draft' }, actor: { role: 'system_admin', id: 'admin-1' }, now
    });
    assert.equal(reopened.status, 'draft');
    assert.equal(reopened.publication_state, 'unpublished');
    assert.equal(reopened.published_at, null);
    assert.equal(reopened.publication_log.at(-1).action, 'reopened_as_draft');
  }
});

test('reopening as a draft still cannot skip the publish gate', () => {
  const current = { status: 'unpublished', publication_state: 'unpublished', publication_log: [] };

  // Straight from withdrawn to live must stay forbidden for everyone.
  assert.throws(() => applyContentPublicationUpdate({
    collection: 'pages', current, input: { status: 'published' },
    actor: { role: 'system_admin', id: 'admin-1' }, now
  }), (error) => error instanceof ContentPublicationError && error.code === 'INVALID_TRANSITION');

  // And a draft cannot jump to scheduled or published either — it has to pass
  // through review, exactly as it did before this change.
  for (const target of ['scheduled', 'published']) {
    assert.throws(() => applyContentPublicationUpdate({
      collection: 'pages',
      current: { status: 'draft', publication_state: 'unpublished', publication_log: [] },
      input: { status: target }, actor: { role: 'system_admin', id: 'admin-1' }, now
    }), (error) => error instanceof ContentPublicationError && error.code === 'INVALID_TRANSITION');
  }
});

test('draft saves record the custom submission name for editors', () => {
  const updated = applyContentPublicationUpdate({
    collection: 'articles',
    current: { status: 'draft', publication_state: 'unpublished', publication_log: [] },
    input: { title: '更新后的标题', submission_name: '我的保存名称' },
    actor: { role: 'content_editor', id: 'editor-1' }, now
  });
  assert.equal(updated.publication_log.at(-1).action, 'draft_updated');
  assert.equal(updated.publication_log.at(-1).submission_name, '我的保存名称');
});

test('reopening as a draft is still refused for roles that cannot publish', () => {
  assert.throws(() => applyContentPublicationUpdate({
    collection: 'pages',
    current: { status: 'unpublished', publication_state: 'unpublished', publication_log: [] },
    input: { status: 'draft' }, actor: { role: 'review_manager', id: 'reviewer-1' }, now
  }), (error) => error instanceof ContentPublicationError && error.code === 'INVALID_TRANSITION');
});
