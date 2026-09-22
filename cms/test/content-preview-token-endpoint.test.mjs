import assert from 'node:assert/strict';
import test from 'node:test';

const { hashPreviewToken, normalizeTtlSeconds } = await import('../content-preview/content-preview-token.mjs');
const { registerContentPreviewTokenEndpoint, resolvePreviewOpenUrl } = await import('../extensions/content-preview-token-endpoint/dist/index.js');

function responseCapture() {
  const capture = { statusCode: null, body: null, contentType: null };
  return { capture, response: { status(code) { capture.statusCode = code; return this; }, type(value) { capture.contentType = value; return this; }, json(body) { capture.body = body; return this; }, send(body) { capture.body = body; return this; } } };
}

function mutableDatabase(tables) {
  function database(table) {
    let filters = {};
    const matching = () => (tables[table] || []).filter((row) => Object.entries(filters).every(([key, value]) => String(row[key]) === String(value)));
    return {
      where(value) { filters = { ...filters, ...value }; return this; },
      first() { return Promise.resolve(matching()[0] || null); },
      then(resolve, reject) { return Promise.resolve(matching()).then(resolve, reject); },
      insert(value) { const id = `${table}-${(tables[table]?.length || 0) + 1}`; tables[table].push({ id, ...value }); return Promise.resolve([id]); },
      update(value) { const rows = matching(); rows.forEach((row) => Object.assign(row, value)); return Promise.resolve(rows.length); }
    };
  }
  return database;
}

function endpointHarness(tables, options = {}) {
  const handlers = new Map();
  registerContentPreviewTokenEndpoint({
    post(path, handler) { handlers.set(`POST ${path}`, handler); },
    get(path, handler) { handlers.set(`GET ${path}`, handler); }
  }, { database: mutableDatabase(tables), now: options.now || (() => new Date('2026-08-05T00:00:00.000Z')), randomBytes: options.randomBytes, websitePreviewOpenUrl: options.websitePreviewOpenUrl });
  return handlers;
}

test('qualification grants enforce gallery type, scope and draft state', async () => {
 const record = {id:'7',type:'certificate',status:'draft',publication_state:'unpublished'};
 const asset = {id:'113',file_id:'file',enabled:true,status:'draft',publication_state:'unpublished',usage_scope:'qualification',page_key:'about',section_key:'certificates',placement_key:'qualification.image',media_type:'image'};
 const issue = endpointHarness({directus_roles:[{id:'editor-role',name:'内容编辑'}],qualifications:[record],media_assets:[asset]}).get('POST /media/issue');
 const call = async () => {
  const r = responseCapture();
  await issue({accountability:{user:'editor',role:'editor-role'},body:{contentCollection:'qualifications',contentItemId:'7',assetId:'113'}},r.response,e=>{throw e;});
  return r.capture.statusCode;
 };
 for (const [type, section] of [['certificate','certificates'],['honor','honors'],['patent','patents']]) {
  record.type=type; asset.section_key=section;
  assert.equal(await call(),201);
  asset.section_key='hero'; assert.equal(await call(),400);
 }
 asset.section_key='patents'; asset.enabled=false; assert.equal(await call(),400);
 asset.enabled=true; record.publication_state='published'; assert.equal(await call(),400);
});

test('news cover grants require an editor and matching placement, then bind single-use redemption to the article', async () => {
 const tables = {
  directus_roles: [{ id: 'editor-role', name: '内容编辑' }],
  articles: [{ id: '42', category: 'news', status: 'draft', publication_state: 'unpublished' }],
  media_assets: [{ id: '98', file_id: 'file', enabled: true, status: 'draft', publication_state: 'unpublished', usage_scope: 'article', media_type: 'image', placement_key: 'news.dynamic_news.cover', page_key: 'news', section_key: 'dynamic-news' }]
 };
 const handlers = endpointHarness(tables);
 const issue = handlers.get('POST /media/issue');
 const consume = handlers.get('POST /media/consume');
 assert.equal(typeof issue, 'function');
 const input = { contentCollection: 'articles', contentItemId: '42', assetId: '98' };
 const invoke = async (handler, req) => { const result=responseCapture(); await handler(req,result.response,error=>{throw error;}); return result.capture; };
 assert.equal((await invoke(issue,{body:input})).statusCode,403);
 const req={accountability:{user:'editor',role:'editor-role'},body:input};
 tables.media_assets[0].page_key='home';
 assert.equal((await invoke(issue,req)).statusCode,400);
 tables.media_assets[0].page_key='news';
 const issued=await invoke(issue,req);
 assert.equal(issued.statusCode,201);
 const token=issued.body.data.token;
 assert.equal((await invoke(consume,{body:{token,contentCollection:'articles',contentItemId:'43'}})).statusCode,404);
 const redeemed=await invoke(consume,{body:{token,...input}});
 assert.equal(redeemed.statusCode,200);
 assert.equal(redeemed.body.data.assetId,'98');
 assert.equal((await invoke(consume,{body:{token,...input}})).statusCode,404);
 tables.articles[0].category='video';
 assert.equal((await invoke(issue,req)).statusCode,400);
 Object.assign(tables.media_assets[0],{media_type:'video',placement_key:'news.video_share.list',section_key:'video-sharing'});
 const videoGrant=await invoke(issue,req);
 assert.equal(videoGrant.statusCode,201,'video sharing can authorize its own draft video');
 tables.media_assets[0].enabled=false;
 assert.equal((await invoke(issue,req)).statusCode,400);
 tables.pages=[{id:'1',slug:'home',status:'draft',publication_state:'unpublished'}];
 Object.assign(tables.media_assets[0],{enabled:true,usage_scope:'homepage',media_type:'video',placement_key:'home.hero.video',page_key:'home',section_key:'hero'});
 const homeReq={...req,body:{...input,contentCollection:'pages',contentItemId:'1'}};
 assert.equal((await invoke(issue,homeReq)).statusCode,201,'homepage can authorize its hero video');
 tables.pages[0].slug='about';
 assert.equal((await invoke(issue,homeReq)).statusCode,400);
 Object.assign(tables.pages[0],{slug:'service',sections:[{id:'hero'}]});
 Object.assign(tables.media_assets[0],{usage_scope:'service',media_type:'image',placement_key:'service.hero.image',page_key:'service',section_key:'hero'});
 assert.equal((await invoke(issue,homeReq)).statusCode,201,'page can authorize its new background');
 tables.media_assets[0].enabled=false;
  assert.equal((await invoke(issue,homeReq)).statusCode,400);
});

test('product series cover grants require the governed product gallery image placement', async () => {
 const tables = {
  directus_roles: [{ id: 'editor-role', name: '内容编辑' }],
  product_series: [{ id: '1', status: 'draft', publication_state: 'unpublished' }],
  media_assets: [{ id: '50', file_id: 'file', enabled: true, status: 'draft', publication_state: 'unpublished', usage_scope: 'product', page_key: 'product', placement_key: 'product.gallery.image', media_type: 'image' }]
 };
 const issue = endpointHarness(tables).get('POST /media/issue');
 const call = async () => {
  const result = responseCapture();
  await issue({ accountability: { user: 'editor', role: 'editor-role' }, body: { contentCollection: 'product_series', contentItemId: '1', assetId: '50' } }, result.response, error => { throw error; });
  return result.capture.statusCode;
 };
 assert.equal(await call(), 201);
 tables.media_assets[0].placement_key = 'product.document';
 assert.equal(await call(), 400);
 tables.media_assets[0].placement_key = 'product.gallery.image';
 tables.media_assets[0].media_type = 'video';
 assert.equal(await call(), 400);
});

test('attachment grants enforce resource scope, placement, type and draft isolation', async () => {
 const tables={
  directus_roles:[{id:'editor-role',name:'内容编辑'}],
  service_resources:[{id:'1',type:'product_manual',status:'draft',publication_state:'unpublished'}],
  product_models:[{id:'2',status:'draft',publication_state:'unpublished'}],
  media_assets:[{id:'81',file_id:'file',enabled:true,status:'draft',publication_state:'unpublished',usage_scope:'service',page_key:'service',placement_key:'service.document',media_type:'document'}]
 };
 const issue=endpointHarness(tables).get('POST /media/issue');
 const call=async(collection,id)=>{const r=responseCapture();await issue({accountability:{user:'editor',role:'editor-role'},body:{contentCollection:collection,contentItemId:id,assetId:'81'}},r.response,e=>{throw e;});return r.capture.statusCode;};
 assert.equal(await call('service_resources','1'),201);
 assert.equal(await call('product_models','2'),400);
 Object.assign(tables.media_assets[0],{placement_key:'service.tutorial.video',media_type:'video'});
 assert.equal(await call('service_resources','1'),201);
 Object.assign(tables.media_assets[0],{placement_key:'service.tutorial.poster',media_type:'image',section_key:'download'});
 assert.equal(await call('service_resources','1'),201);
 tables.media_assets[0].section_key='hero';
 assert.equal(await call('service_resources','1'),400);
 Object.assign(tables.media_assets[0],{placement_key:'service.document',media_type:'document'});
 Object.assign(tables.media_assets[0],{usage_scope:'product',page_key:'product',placement_key:'product.document'});
 assert.equal(await call('product_models','2'),201);
 assert.equal(await call('service_resources','1'),400);
 tables.media_assets[0].media_type='image';
 assert.equal(await call('product_models','2'),400);
 tables.media_assets[0].media_type='document';
 tables.product_models[0].publication_state='published';
 assert.equal(await call('product_models','2'),400);
});

test('preview token constraints keep TTL short and hash only the bearer token', () => {
  assert.equal(normalizeTtlSeconds(), 900);
  assert.equal(normalizeTtlSeconds(60), 60);
  assert.equal(normalizeTtlSeconds(1801), null);
  assert.equal(normalizeTtlSeconds(59), null);
  assert.throws(() => hashPreviewToken('too-short'), /invalid/i);
});

test('preview URL follows an explicitly allowed CMS hostname without trusting arbitrary hosts', () => {
  const configured = 'http://127.0.0.1:4175/api/preview/open';
  const allowedHosts = '127.0.0.1,172.21.8.140';
  assert.equal(resolvePreviewOpenUrl(configured, '127.0.0.1', allowedHosts), configured);
  assert.equal(resolvePreviewOpenUrl(configured, '172.21.8.140', allowedHosts), 'http://172.21.8.140:4175/api/preview/open');
  assert.equal(resolvePreviewOpenUrl(configured, 'preview-token-thief.test', allowedHosts), configured);
});

test('native Directus preview hands off a one-time token through a website URL fragment', async () => {
  const tables = {
    directus_roles: [{ id: 'editor-role', name: '内容编辑' }],
    repair_page_configs: [{ id: 'repair-1', page_key: 'repair_home', title: '售后服务', status: 'draft', publication_state: 'unpublished' }],
    content_preview_tokens: []
  };
  const handlers = endpointHarness(tables, { randomBytes: (size) => Buffer.alloc(size, 9), websitePreviewOpenUrl: 'http://website.test/api/preview/open' });
  const opened = responseCapture();
  await handlers.get('GET /open')({
    accountability: { user: 'editor-1', role: 'editor-role' },
    query: { contentCollection: 'repair_page_configs', contentItemId: 'repair-1' }
  }, opened.response, (error) => { throw error; });

  assert.equal(opened.capture.statusCode, 200);
  assert.equal(opened.capture.contentType, 'html');
  assert.match(opened.capture.body, /http:\/\/website\.test\/cms-preview-handoff#cmsPreviewToken=/);
  assert.match(opened.capture.body, /http-equiv="refresh"/);
  assert.doesNotMatch(opened.capture.body, /method="post"/);
  assert.doesNotMatch(opened.capture.body, /content-preview-tokens\/auto-submit\.js/);
  assert.doesNotMatch(opened.capture.body, /<script/);
  assert.doesNotMatch(opened.capture.body, /contentCollection=repair_page_configs/);
  assert.equal(tables.content_preview_tokens.length, 1);
  assert.equal(tables.content_preview_tokens[0].content_collection, 'repair_page_configs');
});

test('content editor can issue and consume a one-time draft preview token', async () => {
  const tables = {
    directus_roles: [{ id: 'editor-role', name: '内容编辑' }],
    pages: [{ id: '1', title: '预览标题', slug: 'preview', sections: [{ id: 'intro', body: '预览正文', source_url: 'private' }], status: 'draft', publication_state: 'unpublished', source_document: 'private.docx' }],
    content_preview_tokens: []
  };
  const handlers = endpointHarness(tables, { randomBytes: (size) => Buffer.alloc(size, 7), websitePreviewOpenUrl: 'http://website.test/api/preview/open' });
  const issued = responseCapture();
  await handlers.get('POST /issue')({ accountability: { user: 'editor-1', role: 'editor-role' }, body: { contentCollection: 'pages', contentItemId: '1' } }, issued.response, (error) => { throw error; });
  assert.equal(issued.capture.statusCode, 201);
  const rawToken = issued.capture.body.data.token;
  assert.ok(rawToken);
  assert.notEqual(tables.content_preview_tokens[0].token_hash, rawToken);
  assert.equal(tables.content_preview_tokens[0].token_hash, hashPreviewToken(rawToken));
  assert.equal(issued.capture.body.data.expires_at, '2026-08-05T00:15:00.000Z');
  assert.equal(issued.capture.body.data.preview_open_url, 'http://website.test/api/preview/open');

  const consumed = responseCapture();
  await handlers.get('POST /consume')({ body: { token: rawToken } }, consumed.response, (error) => { throw error; });
  assert.equal(consumed.capture.statusCode, 200);
  assert.equal(consumed.capture.body.data.status, 'used');
  assert.equal(consumed.capture.body.data.content_collection, 'pages');
  assert.equal(consumed.capture.body.data.content_item_id, '1');
  assert.equal(consumed.capture.body.data.token, undefined);
  assert.equal(consumed.capture.body.data.preview.title, '预览标题');
  assert.equal(consumed.capture.body.data.preview.sections[0].body, '预览正文');
  assert.equal('source_document' in consumed.capture.body.data.preview, false);

  const replay = responseCapture();
  await handlers.get('POST /consume')({ body: { token: rawToken } }, replay.response, (error) => { throw error; });
  assert.equal(replay.capture.statusCode, 409);
  assert.equal(replay.capture.body.errors[0].extensions.code, 'PREVIEW_TOKEN_USED');
});

test('page preview includes controlled draft records for the page visual editor', async () => {
  const tables = {
    directus_roles: [{ id: 'editor-role', name: '内容编辑' }],
    pages: [{ id: '7', title: '产品展示', slug: 'product', sections: [{ id: 'hero', title: '首屏' }], status: 'draft', publication_state: 'unpublished' }],
    product_series: [{ id: 'series-1', series_code: 'fr-xs-auto', slug: 'fr-xs-auto', name: '自动穿丝', status: 'draft', publication_state: 'unpublished' }],
    product_models: [{ id: 'model-1', model_code: 'FR400XS(auto)', slug: 'fr400xs-auto', name: 'FR400XS', status: 'draft', publication_state: 'unpublished' }],
    product_parameters: [{ id: 'parameter-1', model_code: 'FR400XS(auto)', field_name: '最大工件重量', value: '500', unit: 'kg', status: 'draft', publication_state: 'unpublished' }],
    content_preview_tokens: []
  };
  const handlers = endpointHarness(tables, { randomBytes: (size) => Buffer.alloc(size, 6) });
  const issued = responseCapture();
  await handlers.get('POST /issue')({ accountability: { user: 'editor-1', role: 'editor-role' }, body: { contentCollection: 'pages', contentItemId: '7' } }, issued.response, (error) => { throw error; });
  const consumed = responseCapture();
  await handlers.get('POST /consume')({ body: { token: issued.capture.body.data.token } }, consumed.response, (error) => { throw error; });
  assert.equal(consumed.capture.statusCode, 200);
  assert.equal(consumed.capture.body.data.preview.related.product_series[0].id, 'series-1');
  assert.equal(consumed.capture.body.data.preview.related.product_models[0].id, 'model-1');
  assert.equal(consumed.capture.body.data.preview.related.product_parameters[0].id, 'parameter-1');
});

test('page preview includes the global site settings record for footer visual editing', async () => {
  const tables = {
    directus_roles: [{ id: 'editor-role', name: '内容编辑' }],
    pages: [{ id: '1', title: '网站主页', slug: 'home', sections: [{ id: 'hero', title: '首屏' }], status: 'draft', publication_state: 'unpublished' }],
    product_series: [{ id: 'series-1', series_code: 'workstation', name: '灵动切割工作站', status: 'draft', publication_state: 'unpublished' }],
    milestones: [{ id: 'milestone-1', source_key: 'timeline-1997', year: 1997, event: '成立', evidence: '始创', status: 'draft', publication_state: 'unpublished' }],
    site_settings: [{ id: 'settings-1', setting_key: 'global', footer: { columns: [] }, status: 'draft', publication_state: 'unpublished' }],
    content_preview_tokens: []
  };
  const handlers = endpointHarness(tables, { randomBytes: (size) => Buffer.alloc(size, 5) });
  const issued = responseCapture();
  await handlers.get('POST /issue')({ accountability: { user: 'editor-1', role: 'editor-role' }, body: { contentCollection: 'pages', contentItemId: '1' } }, issued.response, (error) => { throw error; });
  const consumed = responseCapture();
  await handlers.get('POST /consume')({ body: { token: issued.capture.body.data.token } }, consumed.response, (error) => { throw error; });
  assert.equal(consumed.capture.statusCode, 200);
  assert.equal(consumed.capture.body.data.preview.related.product_series[0].id, 'series-1');
  assert.equal(consumed.capture.body.data.preview.related.milestones[0].id, 'milestone-1');
  assert.equal(consumed.capture.body.data.preview.related.site_settings[0].id, 'settings-1');
});

test('service resource preview includes only the controlled service page for page-level visual editing', async () => {
  const tables = {
    directus_roles: [{ id: 'editor-role', name: '内容编辑' }],
    service_resources: [{ id: 'resource-1', title: '下载资料', status: 'draft', publication_state: 'unpublished' }],
    pages: [
      { id: 'service-page', slug: 'service', title: '服务支持', sections: [{ id: 'download', title: '资料下载' }], status: 'draft', publication_state: 'unpublished' },
      { id: 'home-page', slug: 'home', title: '网站主页', sections: [{ id: 'hero', title: '首页首屏' }], status: 'draft', publication_state: 'unpublished' }
    ],
    service_locations: [],
    site_settings: [],
    content_preview_tokens: []
  };
  const handlers = endpointHarness(tables, { randomBytes: (size) => Buffer.alloc(size, 3) });
  const issued = responseCapture();
  await handlers.get('POST /issue')({ accountability: { user: 'editor-1', role: 'editor-role' }, body: { contentCollection: 'service_resources', contentItemId: 'resource-1' } }, issued.response, (error) => { throw error; });
  const consumed = responseCapture();
  await handlers.get('POST /consume')({ body: { token: issued.capture.body.data.token } }, consumed.response, (error) => { throw error; });

  assert.equal(consumed.capture.statusCode, 200);
  assert.equal(consumed.capture.body.data.preview.related.pages.length, 1);
  assert.equal(consumed.capture.body.data.preview.related.pages[0].id, 'service-page');
  assert.equal(consumed.capture.body.data.preview.related.pages[0].sections[0].title, '资料下载');
});

test('a milestone-rooted preview includes the complete editable timeline for canvas record switching', async () => {
  const tables = {
    directus_roles: [{ id: 'editor-role', name: '内容编辑' }],
    milestones: [
      { id: '1', source_key: 'timeline-1997', year: 1997, event: '成立', evidence: '始创', sort_order: 1, status: 'draft', publication_state: 'unpublished' },
      { id: '2', source_key: 'timeline-2003', year: 2003, event: '研发', evidence: '创新', sort_order: 2, status: 'draft', publication_state: 'unpublished' }
    ],
    content_preview_tokens: []
  };
  const handlers = endpointHarness(tables, { randomBytes: (size) => Buffer.alloc(size, 4) });
  const issued = responseCapture();
  await handlers.get('POST /issue')({ accountability: { user: 'editor-1', role: 'editor-role' }, body: { contentCollection: 'milestones', contentItemId: '1' } }, issued.response, (error) => { throw error; });
  const consumed = responseCapture();
  await handlers.get('POST /consume')({ body: { token: issued.capture.body.data.token } }, consumed.response, (error) => { throw error; });
  assert.equal(consumed.capture.statusCode, 200);
  assert.deepEqual(consumed.capture.body.data.preview.related.milestones.map((record) => record.id), ['1', '2']);
  assert.equal('source_document' in consumed.capture.body.data.preview.related.milestones[0], false);
});

test('preview issuance enforces role scope, draft state and revocation', async () => {
  const tables = {
    directus_roles: [{ id: 'review-role', name: '审核管理' }, { id: 'system-role', name: '系统管理员' }, { id: 'sales-role', name: '销售人员' }],
    pages: [{ id: '1', status: 'draft', publication_state: 'unpublished' }],
    product_models: [{ id: '2', status: 'published', publication_state: 'published' }],
    content_preview_tokens: []
  };
  const handlers = endpointHarness(tables, { randomBytes: (size) => Buffer.alloc(size, 8) });
  const forbidden = responseCapture();
  await handlers.get('POST /issue')({ accountability: { user: 'review-1', role: 'review-role' }, body: { contentCollection: 'product_models', contentItemId: '2' } }, forbidden.response, (error) => { throw error; });
  assert.equal(forbidden.capture.statusCode, 400);
  assert.equal(forbidden.capture.body.errors[0].extensions.code, 'PREVIEW_TARGET_INVALID');

  const blocked = responseCapture();
  await handlers.get('POST /issue')({ accountability: { user: 'admin-1', role: 'system-role' }, body: { contentCollection: 'product_models', contentItemId: '2' } }, blocked.response, (error) => { throw error; });
  assert.equal(blocked.capture.statusCode, 409);
  assert.equal(blocked.capture.body.errors[0].extensions.code, 'PREVIEW_CONTENT_NOT_DRAFT');

  const denied = responseCapture();
  await handlers.get('POST /issue')({ accountability: { user: 'sales-1', role: 'sales-role' }, body: { contentCollection: 'pages', contentItemId: '1' } }, denied.response, (error) => { throw error; });
  assert.equal(denied.capture.statusCode, 403);

  const issued = responseCapture();
  await handlers.get('POST /issue')({ accountability: { user: 'admin-1', role: 'system-role' }, body: { contentCollection: 'product_models', contentItemId: '2', ttlSeconds: 60 } }, issued.response, (error) => { throw error; });
  assert.equal(issued.capture.statusCode, 409);

  tables.product_models[0].status = 'draft';
  tables.product_models[0].publication_state = 'unpublished';
  await handlers.get('POST /issue')({ accountability: { user: 'admin-1', role: 'system-role' }, body: { contentCollection: 'product_models', contentItemId: '2', ttlSeconds: 60 } }, issued.response, (error) => { throw error; });
  assert.equal(issued.capture.statusCode, 201);
  const tokenId = issued.capture.body.data.id;
  const token = issued.capture.body.data.token;
  const revoked = responseCapture();
  await handlers.get('POST /:id/revoke')({ params: { id: tokenId }, accountability: { user: 'admin-1', role: 'system-role' } }, revoked.response, (error) => { throw error; });
  assert.equal(revoked.capture.statusCode, 200);
  assert.equal(revoked.capture.body.data.status, 'revoked');
  const consumed = responseCapture();
  await handlers.get('POST /consume')({ body: { token } }, consumed.response, (error) => { throw error; });
  assert.equal(consumed.capture.statusCode, 410);
  assert.equal(consumed.capture.body.errors[0].extensions.code, 'PREVIEW_TOKEN_REVOKED');
});
