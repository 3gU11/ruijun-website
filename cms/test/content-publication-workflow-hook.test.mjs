import assert from 'node:assert/strict';
import test from 'node:test';

const { registerContentPublicationWorkflowHook } = await import('../extensions/content-publication-workflow/dist/index.js');

function hookContext({ roleName, record, mediaAssets = [], file = null, user = 'user-1' }) {
  const versions = [];
  return {
    versions,
    accountability: { user, role: 'role-1' },
    database(table) {
      if (table === 'content_versions') return { async insert(value) { versions.push(value); } };
      return {
        where() { return this; },
        whereIn() { return this; },
        select() { return mediaAssets; },
        async first() {
          if (table === 'directus_roles') return { id: 'role-1', name: roleName };
          if (table === 'directus_files') return file;
          return record;
        }
      };
    }
  };
}

test('content publication hook removes forged audit fields and forces a server-generated review submission', async () => {
  const hooks = new Map();
  registerContentPublicationWorkflowHook({ filter: (event, handler) => hooks.set(event, handler) });
  const result = await hooks.get('pages.items.update')(
    { title: 'New copy', status: 'review', publication_state: 'published', publication_log: [{ action: 'forged' }] },
    { keys: ['page-1'] }, hookContext({ roleName: '内容编辑', record: { id: 'page-1', status: 'draft', publication_state: 'unpublished', publication_log: [] } })
  );

  assert.equal(result.status, 'review');
  assert.equal(result.publication_state, 'unpublished');
  assert.equal(result.publication_log.at(-1).action, 'submitted_for_review');
});

test('content publication hook prevents a reviewer from approving content outside their role scope', async () => {
  const hooks = new Map();
  registerContentPublicationWorkflowHook({ filter: (event, handler) => hooks.set(event, handler) });
  await assert.rejects(
    hooks.get('product_models.items.update')({ status: 'scheduled' }, { keys: ['page-1'] }, hookContext({ roleName: '审核管理', record: { id: 'page-1', status: 'review', publication_state: 'unpublished' } })),
    /cannot review this content type/
  );
});

test('content publication hook forces newly created content to a draft and blocks reviewer-created records', async () => {
  const hooks = new Map();
  registerContentPublicationWorkflowHook({ filter: (event, handler) => hooks.set(event, handler) });
  const created = await hooks.get('articles.items.create')(
    { title: 'New article', status: 'published' }, {}, hookContext({ roleName: '内容编辑', record: null })
  );
  assert.equal(created.status, 'draft');
  assert.equal(created.publication_state, 'unpublished');
  await assert.rejects(
    hooks.get('articles.items.create')({ title: 'Forbidden' }, {}, hookContext({ roleName: '审核管理', record: null })),
    /cannot create publishable content/
  );
});

test('content publication hook blocks review submission until every managed media reference is published', async () => {
  const hooks = new Map();
  registerContentPublicationWorkflowHook({ filter: (event, handler) => hooks.set(event, handler) });

  await assert.rejects(
    hooks.get('product_models.items.update')(
      { status: 'review' }, { keys: ['model-1'] },
      hookContext({
        roleName: '内容编辑',
        record: { id: 'model-1', status: 'draft', publication_state: 'unpublished', publication_log: [], media: [{ media_asset_id: 'draft-asset' }] },
        mediaAssets: [{ id: 'draft-asset', status: 'draft', publication_state: 'unpublished' }]
      })
    ),
    /not published/
  );
});

test('content publication hook rejects a media asset whose declared metadata does not match the uploaded file', async () => {
  const hooks = new Map();
  registerContentPublicationWorkflowHook({ filter: (event, handler) => hooks.set(event, handler) });

  await assert.rejects(
    hooks.get('media_assets.items.create')(
      { file_id: 'file-1', original_file_name: 'machine.webp', mime_type: 'image/webp', byte_size: 2_000, usage_scope: 'product', copyright_status: 'authorized' },
      {}, hookContext({ roleName: '系统管理员', record: null, file: { id: 'file-1', filename_download: 'machine.webp', type: 'image/webp', filesize: 1_024 } })
    ),
    /metadata does not match/
  );
});

test('content publication hook revalidates the actual file whenever a media asset draft is edited', async () => {
  const hooks = new Map();
  registerContentPublicationWorkflowHook({ filter: (event, handler) => hooks.set(event, handler) });
  const validDraft = {
    id: 7, status: 'draft', publication_state: 'unpublished', publication_log: [], file_id: 'file-1',
    original_file_name: 'machine.webp', mime_type: 'image/webp', byte_size: 1_024, usage_scope: 'product', copyright_status: 'authorized'
  };

  await assert.rejects(
    hooks.get('media_assets.items.update')(
      { byte_size: 2_000 }, { keys: [7] },
      hookContext({ roleName: '内容编辑', record: validDraft, file: { id: 'file-1', filename_download: 'machine.webp', type: 'image/webp', filesize: 1_024 } })
    ),
    /metadata does not match/
  );
});

test('content publication hook rejects final publication blockers before writing a version', async () => {
  const hooks = new Map();
  registerContentPublicationWorkflowHook({ filter: (event, handler) => hooks.set(event, handler) });
  const context = hookContext({
    roleName: '系统管理员',
    record: { id: 'page-1', status: 'scheduled', publication_state: 'unpublished', slug: 'home', title: '首页', language: 'zh-CN', sections: '[]', seo: '{}', source_document: 'home.md' }
  });

  await assert.rejects(
    hooks.get('pages.items.update')({ status: 'published' }, { keys: ['page-1'] }, context),
    /not ready for publication/
  );
  assert.deepEqual(context.versions, []);
});
