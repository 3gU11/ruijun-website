import assert from 'node:assert/strict';
import test from 'node:test';

const { registerContentPublicationWorkflowHook } = await import('../extensions/content-publication-workflow/src/index.js');

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

test('content publication hook allows unified review management to approve product drafts', async () => {
  const hooks = new Map();
  registerContentPublicationWorkflowHook({ filter: (event, handler) => hooks.set(event, handler) });
  // Approval now runs the full publication gate (SEO/media/required fields), so
  // the fixture has to be a record that could actually go live.
  const result = await hooks.get('product_models.items.update')(
    { status: 'scheduled' }, { keys: ['page-1'] }, hookContext({
      roleName: '审核管理',
      record: {
        id: 'page-1',
        status: 'review',
        publication_state: 'unpublished',
        model_code: 'FR400XS',
        series_code: 'fr-xs-auto',
        source_document: 'demo/product-catalog.md',
        parameters: { thickness: '400' }
      }
    })
  );
  assert.equal(result.status, 'scheduled');
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
    /不能创建可发布的内容/
  );
});

test('content publication hook blocks review submission until every managed media reference is published', async () => {
  const hooks = new Map();
  registerContentPublicationWorkflowHook({ filter: (event, handler) => hooks.set(event, handler) });

  // The message must name the offending asset: an operator cannot act on a bare
  // id like "draft-asset".
  await assert.rejects(
    hooks.get('product_models.items.update')(
      { status: 'review' }, { keys: ['model-1'] },
      hookContext({
        roleName: '内容编辑',
        record: { id: 'model-1', status: 'draft', publication_state: 'unpublished', publication_log: [], media: [{ media_asset_id: 'draft-asset' }] },
        mediaAssets: [{ id: 'draft-asset', title: '车间实拍图', placement_key: 'home.reason.background', status: 'draft', publication_state: 'unpublished' }]
      })
    ),
    (error) => {
      assert.match(error.message, /车间实拍图/);
      assert.match(error.message, /home\.reason\.background/);
      assert.match(error.message, /尚未发布/);
      return true;
    }
  );
});

test('media assets are published immediately and no longer enter review', async () => {
  const hooks = new Map();
  registerContentPublicationWorkflowHook({ filter: (event, handler) => hooks.set(event, handler) });
  const created = await hooks.get('media_assets.items.create')(
    {
      file_id: 'file-1', original_file_name: 'share.mp4', mime_type: 'video/mp4', byte_size: 1024,
      media_type: 'video', width: 1280, height: 720, usage_scope: 'article', copyright_status: 'owned',
      placement_key: 'news.video_share.list', enabled: true, transcript: ''
    },
    {},
    hookContext({
      roleName: '内容编辑',
      record: null,
      file: { id: 'file-1', filename_download: 'share.mp4', type: 'video/mp4', filesize: 1024 }
    })
  );
  assert.equal(created.status, 'published');
  assert.equal(created.publication_state, 'published');
  assert.equal(created.publication_log.at(-1).action, 'created_as_published');
});

test('editing a published media asset never unpublishes it', async () => {
  const hooks = new Map();
  registerContentPublicationWorkflowHook({ filter: (event, handler) => hooks.set(event, handler) });
  const record = {
    id: 7, status: 'published', publication_state: 'published', published_at: '2026-08-01T00:00:00.000Z',
    publication_log: [], file_id: 'file-1', original_file_name: 'share.mp4', mime_type: 'video/mp4',
    byte_size: 1024, media_type: 'video', width: 1280, height: 720, usage_scope: 'article',
    copyright_status: 'owned', placement_key: 'news.video_share.list', transcript: ''
  };
  const result = await hooks.get('media_assets.items.update')(
    { title: '新标题' }, { keys: [7] },
    hookContext({
      roleName: '内容编辑',
      record,
      file: { id: 'file-1', filename_download: 'share.mp4', type: 'video/mp4', filesize: 1024 }
    })
  );
  assert.equal(result.title, '新标题');
  assert.equal(result.status, 'published');
  assert.equal(result.publication_state, 'published');
});

test('media assets reject legacy review transitions now that review is cancelled', async () => {
  const hooks = new Map();
  registerContentPublicationWorkflowHook({ filter: (event, handler) => hooks.set(event, handler) });
  await assert.rejects(
    hooks.get('media_assets.items.update')(
      { status: 'review' }, { keys: [8] },
      hookContext({
        roleName: '内容编辑',
        record: { id: 8, status: 'draft', publication_state: 'unpublished', publication_log: [], file_id: 'file-1',
          original_file_name: 'share.mp4', mime_type: 'video/mp4', byte_size: 1024, media_type: 'video',
          width: 1280, height: 720, usage_scope: 'article', copyright_status: 'owned',
          placement_key: 'news.video_share.list', transcript: '' },
        file: { id: 'file-1', filename_download: 'share.mp4', type: 'video/mp4', filesize: 1024 }
      })
    ),
    /已取消审核/
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
    /素材信息与上传的文件不一致/
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
    /素材信息与上传的文件不一致/
  );
});

test('content publication hook normalizes required autoplay and muted settings for existing hero video drafts', async () => {
  const hooks = new Map();
  registerContentPublicationWorkflowHook({ filter: (event, handler) => hooks.set(event, handler) });
  const result = await hooks.get('media_assets.items.update')(
    { title: '莱鸟图库-草地上的一群.mp4' }, { keys: [7] },
    hookContext({
      roleName: '内容编辑',
      record: {
        id: 7, status: 'draft', publication_state: 'unpublished', publication_log: [], file_id: 'file-1',
        original_file_name: 'video.mp4', mime_type: 'video/mp4', byte_size: 1024, media_type: 'video',
        width: 1920, height: 1080, usage_scope: 'homepage', copyright_status: 'owned',
        placement_key: 'home.hero.video', poster_asset_id: 'poster-1', autoplay: false, muted: false
      },
      file: { id: 'file-1', filename_download: 'video.mp4', type: 'video/mp4', filesize: 1024 }
    })
  );
  assert.equal(result.autoplay, true);
  assert.equal(result.muted, true);
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
    /内容尚未达到发布条件/
  );
  assert.deepEqual(context.versions, []);
});
