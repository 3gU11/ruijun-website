import assert from 'node:assert/strict';
import test from 'node:test';
import { acceptCmsLivePreviewCommand, acceptCmsLivePreviewMediaReplaceMessage, acceptCmsLivePreviewMessage, applyCmsLivePreviewMediaElement, CMS_LIVE_PREVIEW_COMMAND, CMS_LIVE_PREVIEW_MEDIA_REPLACE, CMS_LIVE_PREVIEW_UPDATE, cmsPreviewScrollOptions, cmsPreviewSectionSelector, cmsPreviewStatusLabel, createCmsVisualEditRequest, isCmsLivePreviewSessionExpired, makeCmsPreviewRecordRenderable, normalizeCmsLivePreviewMediaUrl, normalizeCmsLivePreviewOrigins, resolveCmsLivePreviewParentOrigin, resolveCmsVisualElementBinding, resolveCmsVisualRootBinding, sanitizeCmsLivePreviewRecord } from '../utils/cms-live-preview.mjs';

const session = { collection: 'articles', itemId: '42', expiresAt: '2030-01-01T00:00:00.000Z' };

test('article cover live updates preserve the asset identity needed by the preview session', () => {
  const result = sanitizeCmsLivePreviewRecord('articles', {
    id: 42, cover_asset: '/api/preview/media/98', cover_media_asset_id: '98', private_note: 'private'
  });
  assert.deepEqual(result, { id: 42, cover_asset: '/api/preview/media/98', cover_media_asset_id: '98' });
});

test('live preview status follows the currently selected related record instead of the token-start label', () => {
  assert.equal(cmsPreviewStatusLabel({
    collection: 'milestones',
    record: { id: 3, year: 2006, event: '成立瑞钧机械（迁址昆山）' },
    fallbackLabel: '1997 成立丰华数控（公司始创）'
  }), '2006 成立瑞钧机械（迁址昆山）');
  assert.equal(cmsPreviewStatusLabel({
    collection: 'pages',
    record: { id: 2, title: '关于瑞钧', slug: 'about' },
    fallbackLabel: '当前草稿'
  }), '关于瑞钧');
  assert.equal(cmsPreviewStatusLabel({ collection: 'milestones', record: {}, fallbackLabel: '当前草稿' }), '当前草稿');
});

test('visual canvas target scroll reserves a safe top area for the CMS toolbar', async () => {
  assert.deepEqual(cmsPreviewScrollOptions({ visualEditMode: true }), { behavior: 'auto', block: 'start', inline: 'nearest' });
  assert.deepEqual(cmsPreviewScrollOptions({ visualEditMode: false }), { behavior: 'auto', block: 'center', inline: 'nearest' });
  const [preview, app] = await Promise.all([
    (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8'),
    (await import('node:fs/promises')).readFile(new URL('../app.vue', import.meta.url), 'utf8')
  ]);
  assert.match(preview, /target\.scrollIntoView\(cmsPreviewScrollOptions\(\{ visualEditMode: visualEditMode\.value \}\)\)/);
  assert.match(app, /html\[data-cms-preview-edit-mode="true"\] \[data-cms-preview-key\] \{\s*scroll-margin-top: 180px;/);
});

test('live preview exposes an explicit expired-session check without accepting expired content', () => {
  assert.equal(isCmsLivePreviewSessionExpired(session, Date.parse('2029-01-01')), false);
  assert.equal(isCmsLivePreviewSessionExpired(session, Date.parse('2031-01-01')), true);
  assert.equal(isCmsLivePreviewSessionExpired({ ...session, expiresAt: 'invalid' }, Date.parse('2029-01-01')), true);
});

test('live preview accepts only a safe alignment command for the active session', () => {
  const parentWindow = {};
  const event = { source: parentWindow, origin: 'http://127.0.0.1:8055', data: { type: CMS_LIVE_PREVIEW_COMMAND, collection: 'articles', itemId: '42', command: 'align', sectionKey: 'hero', fieldPath: 'layout.align_x', mode: 'center' } };
  assert.deepEqual(acceptCmsLivePreviewCommand({ event, parentWindow, allowedOrigin: event.origin, session, now: Date.parse('2029-01-01') }), { command: 'align', sectionKey: 'hero', fieldPath: 'layout.align_x', mode: 'center' });
  assert.equal(acceptCmsLivePreviewCommand({ event: { ...event, data: { ...event.data, mode: 'bottom' } }, parentWindow, allowedOrigin: event.origin, session, now: Date.parse('2029-01-01') }), null);
  assert.equal(acceptCmsLivePreviewCommand({ event: { ...event, data: { ...event.data, fieldPath: '__proto__.x' } }, parentWindow, allowedOrigin: event.origin, session, now: Date.parse('2029-01-01') }), null);
});

test('live preview accepts matching messages and strips private fields', () => {
  const preview = acceptCmsLivePreviewMessage({
    event: { origin: 'http://127.0.0.1:8055', data: { type: CMS_LIVE_PREVIEW_UPDATE, collection: 'articles', itemId: 42, preview: { id: 42, title: '未保存标题', private_contact: 'secret' } } },
    allowedOrigin: 'http://127.0.0.1:8055', session, now: Date.parse('2029-01-01')
  });
  assert.deepEqual(preview, { id: 42, title: '未保存标题' });
});

test('page preview accepts only related records issued in the same preview session', () => {
  const pageSession = {
    collection: 'pages', itemId: '7', expiresAt: '2030-01-01T00:00:00.000Z',
    preview: { related: { product_parameters: [{ id: 1, model_code: 'fr400xs-auto', value: '400*290' }] } }
  };
  const message = { type: CMS_LIVE_PREVIEW_UPDATE, collection: 'product_parameters', itemId: '1', preview: { id: 1, model_code: 'fr400xs-auto', value: 'TDD' } };
  assert.deepEqual(acceptCmsLivePreviewMessage({ event: { origin: 'http://127.0.0.1:8055', data: message }, allowedOrigin: 'http://127.0.0.1:8055', session: pageSession, now: Date.parse('2029-01-01') }), { id: 1, model_code: 'fr400xs-auto', value: 'TDD' });
  assert.equal(acceptCmsLivePreviewMessage({ event: { origin: 'http://127.0.0.1:8055', data: { ...message, itemId: '2', preview: { ...message.preview, id: 2 } } }, allowedOrigin: 'http://127.0.0.1:8055', session: pageSession, now: Date.parse('2029-01-01') }), null);
});

test('visual media replacement accepts only a matching controlled asset request', () => {
  const parentWindow = {};
  const data = {
    type: CMS_LIVE_PREVIEW_MEDIA_REPLACE,
    collection: 'pages',
    itemId: 'home',
    sectionKey: 'home-reasons',
    fieldPath: 'sections.0.items.1.image',
    mediaRole: 'image',
    mediaAssetId: 'asset_01',
    mediaUrl: 'http://127.0.0.1:8055/assets/file-01'
  };
  assert.deepEqual(acceptCmsLivePreviewMediaReplaceMessage({
    event: { source: parentWindow, origin: 'http://127.0.0.1:8055', data },
    allowedOrigin: 'http://127.0.0.1:8055',
    session: { collection: 'pages', itemId: 'home', expiresAt: '2030-01-01T00:00:00.000Z' },
    parentWindow,
    now: Date.parse('2029-01-01')
  }), { sectionKey: 'home-reasons', fieldPath: 'sections.0.items.1.image', mediaRole: 'image', mediaAssetId: 'asset_01', mediaUrl: 'http://127.0.0.1:8055/assets/file-01' });
});

test('media replacement only accepts asset URLs from the configured CMS origin', () => {
  assert.equal(normalizeCmsLivePreviewMediaUrl('http://127.0.0.1:8055/assets/file-01', 'http://127.0.0.1:8055'), 'http://127.0.0.1:8055/assets/file-01');
  assert.equal(normalizeCmsLivePreviewMediaUrl('/assets/file-01', 'http://127.0.0.1:8055'), '/assets/file-01');
  assert.equal(normalizeCmsLivePreviewMediaUrl('https://evil.test/file.jpg', 'http://127.0.0.1:8055'), '');
  assert.equal(normalizeCmsLivePreviewMediaUrl('javascript:alert(1)', 'http://127.0.0.1:8055'), '');
  assert.equal(normalizeCmsLivePreviewMediaUrl('/assets/../private', 'http://127.0.0.1:8055'), '');
});

test('media replacement mutates the selected image, video, or background immediately', () => {
  const image = { tagName: 'IMG', src: '', style: {}, dataset: {}, matches(selector) { return selector === 'img'; } };
  const video = { tagName: 'VIDEO', src: '', poster: '', style: {}, dataset: {}, loadCount: 0, matches(selector) { return selector === 'video'; }, load() { this.loadCount += 1; } };
  const background = { tagName: 'DIV', style: {}, dataset: {}, matches() { return false; } };
  const replacement = { mediaUrl: '/assets/new-file', mediaAssetId: 'asset_02', mediaRole: 'image' };
  assert.equal(applyCmsLivePreviewMediaElement(image, replacement), true);
  assert.equal(image.src, '/assets/new-file');
  assert.equal(image.dataset.cmsPreviewMediaAssetId, 'asset_02');
  assert.equal(applyCmsLivePreviewMediaElement(video, { ...replacement, mediaRole: 'video' }), true);
  assert.equal(video.src, '/assets/new-file');
  assert.equal(video.loadCount, 1);
  assert.equal(applyCmsLivePreviewMediaElement(background, { ...replacement, mediaRole: 'background' }), true);
  assert.equal(background.style.backgroundImage, 'url("/assets/new-file")');
});

test('visual media replacement rejects forged source, field paths, roles, and asset ids', () => {
  const parentWindow = {};
  const base = { type: CMS_LIVE_PREVIEW_MEDIA_REPLACE, collection: 'pages', itemId: 'home', sectionKey: 'home', fieldPath: 'sections.0.image', mediaRole: 'background', mediaAssetId: 'asset_01' };
  const input = (data, overrides = {}) => acceptCmsLivePreviewMediaReplaceMessage({
    event: { source: parentWindow, origin: 'http://127.0.0.1:8055', data: { ...base, ...data } },
    allowedOrigin: 'http://127.0.0.1:8055',
    session: { collection: 'pages', itemId: 'home', expiresAt: '2030-01-01T00:00:00.000Z' },
    parentWindow,
    now: Date.parse('2029-01-01'),
    ...overrides
  });
  assert.equal(input({}, { parentWindow: {} }), null);
  assert.equal(input({ fieldPath: 'sections.0.__proto__.image' }), null);
  assert.equal(input({ mediaRole: 'arbitrary-url' }), null);
  assert.equal(input({ mediaAssetId: 'https://evil.test/file.jpg' }), null);
  assert.equal(input({ sectionKey: 'x"],iframe' }), null);
});

test('live preview rejects wrong origins, records, expired sessions, and unsupported collections', () => {
  const message = { type: CMS_LIVE_PREVIEW_UPDATE, collection: 'articles', itemId: '42', preview: { title: 'x' } };
  assert.equal(acceptCmsLivePreviewMessage({ event: { origin: 'http://evil.test', data: message }, allowedOrigin: 'http://127.0.0.1:8055', session, now: 0 }), null);
  assert.equal(acceptCmsLivePreviewMessage({ event: { origin: 'http://127.0.0.1:8055', data: { ...message, itemId: '43' } }, allowedOrigin: 'http://127.0.0.1:8055', session, now: 0 }), null);
  assert.equal(acceptCmsLivePreviewMessage({ event: { origin: 'http://127.0.0.1:8055', data: message }, allowedOrigin: 'http://127.0.0.1:8055', session, now: Date.parse('2031-01-01') }), null);
  assert.equal(sanitizeCmsLivePreviewRecord('private_contacts', { phone: '123' }), null);
});

test('live preview accepts an explicit local and LAN origin allowlist only', () => {
  const allowedOrigin = 'http://127.0.0.1:8055, http://172.21.8.140:8055, invalid';
  const message = { type: CMS_LIVE_PREVIEW_UPDATE, collection: 'articles', itemId: '42', preview: { title: '局域网未保存标题' } };

  assert.deepEqual(normalizeCmsLivePreviewOrigins(allowedOrigin), ['http://127.0.0.1:8055', 'http://172.21.8.140:8055']);
  assert.deepEqual(acceptCmsLivePreviewMessage({
    event: { origin: 'http://172.21.8.140:8055', data: message }, allowedOrigin, session, now: Date.parse('2029-01-01')
  }), { title: '局域网未保存标题' });
  assert.equal(acceptCmsLivePreviewMessage({
    event: { origin: 'http://172.21.8.141:8055', data: message }, allowedOrigin, session, now: Date.parse('2029-01-01')
  }), null);
});

test('canvas selection resolves a configured parent origin when ancestor origins are unavailable', () => {
  const allowlist = 'http://127.0.0.1:8055, http://172.21.8.140:8055';
  assert.equal(resolveCmsLivePreviewParentOrigin({
    ancestorOrigin: '',
    referrer: 'http://127.0.0.1:8055/admin/ruijun-content-editor-workbench',
    allowedOrigin: allowlist
  }), 'http://127.0.0.1:8055');
  assert.equal(resolveCmsLivePreviewParentOrigin({
    ancestorOrigin: '',
    referrer: 'http://evil.test/frame',
    allowedOrigin: allowlist
  }), 'http://127.0.0.1:8055');
  assert.equal(resolveCmsLivePreviewParentOrigin({
    ancestorOrigin: 'http://172.21.8.140:8055',
    referrer: 'http://127.0.0.1:8055/admin',
    allowedOrigin: allowlist
  }), 'http://172.21.8.140:8055');
});

test('live preview section keys only produce bounded data selectors', () => {
  assert.equal(cmsPreviewSectionSelector('clients-domestic'), '[data-cms-preview-key="clients-domestic"]');
  assert.equal(cmsPreviewSectionSelector(' patents '), '[data-cms-preview-key="patents"]');
  assert.equal(cmsPreviewSectionSelector('[data-secret]'), '');
  assert.equal(cmsPreviewSectionSelector('x"], iframe'), '');
});

test('authenticated preview records render claim-review sections without changing the public sanitizer', () => {
  const record = { sections: [{ id: 'patents', title: '待审核宣传数字', requires_claim_review: true }] };
  const renderable = makeCmsPreviewRecordRenderable(record);
  assert.equal(renderable.sections[0].requires_claim_review, false);
  assert.equal(record.sections[0].requires_claim_review, true);
  assert.equal(sanitizeCmsLivePreviewRecord('pages', record).sections[0].requires_claim_review, true);
});

test('page sections are recursively reduced to preview-safe fields', () => {
  assert.deepEqual(sanitizeCmsLivePreviewRecord('pages', { title: '首页', source_document: 'private', sections: [{ id: 'hero', title: '标题', body: '正文', layout: { align_x: 'left' }, text_style: { size_desktop: 48 }, internal_note: 'private' }] }), {
    title: '首页', sections: [{ id: 'hero', title: '标题', body: '正文', layout: { align_x: 'left' }, text_style: { size_desktop: 48 } }]
  });
});

test('live preview retains a homepage hero video asset only on the hero section', () => {
  const preview = sanitizeCmsLivePreviewRecord('pages', {
    id: 1,
    slug: 'home',
    sections: [
      { id: 'hero', hero_video_asset_id: '49', hero_video_asset_url: 'http://127.0.0.1:8055/assets/hero.mp4', internal_note: 'private' },
      { id: 'intro', hero_video_asset_id: '50', hero_video_asset_url: 'http://127.0.0.1:8055/assets/not-allowed.mp4', internal_note: 'private' }
    ]
  });

  assert.deepEqual(preview.sections, [
    { id: 'hero', hero_video_asset_id: '49', hero_video_asset_url: 'http://127.0.0.1:8055/assets/hero.mp4' },
    { id: 'intro' }
  ]);
});

test('page preview preserves controlled service office regions without exposing internal fields', () => {
  const preview = sanitizeCmsLivePreviewRecord('pages', {
    id: 3,
    slug: 'service',
    sections: [{
      id: 'office-directory',
      items: [{
        title: '珠三角区',
        media_role: 'office-3',
        map_media_role: 'office-map-3',
        map: '/assets/service-office-map-3.jpg',
        offices: [{
          address: '东莞长安店：东莞市长安镇振安东路768号',
          manager: '孙金诚经理',
          phone: '15050166844',
          source_key: 'office-3-0',
          internal_contact_id: 'private'
        }],
        internal_note: 'private'
      }]
    }]
  });

  assert.deepEqual(preview.sections[0].items[0], {
    title: '珠三角区',
    media_role: 'office-3',
    map_media_role: 'office-map-3',
    map: '/assets/service-office-map-3.jpg',
    offices: [{
      address: '东莞长安店：东莞市长安镇振安东路768号',
      manager: '孙金诚经理',
      phone: '15050166844',
      source_key: 'office-3-0'
    }]
  });
});

test('service human-support copy survives the live-preview sanitizer without exposing private content', () => {
  const preview = sanitizeCmsLivePreviewRecord('pages', {
    id: 3,
    slug: 'service',
    sections: [{
      id: 'support',
      content: { human_support_label: '需要人工协助？-画布验收', internal_note: 'private' }
    }]
  });

  assert.deepEqual(preview.sections, [{
    id: 'support',
    content: { human_support_label: '需要人工协助？-画布验收' }
  }]);
});

test('service FAQ and contact copy survives the controlled live-preview sanitizer', () => {
  const content = {
    faq_title: '常见服务问题',
    faq_1_question: '自定义 FAQ 问题',
    faq_4_cta: '继续咨询',
    contact_title: '联系瑞钧',
    contact_sales_body: '自定义选型说明',
    contact_visit_cta: '预约来访',
    internal_note: 'private'
  };
  const preview = sanitizeCmsLivePreviewRecord('pages', {
    id: 3,
    slug: 'service',
    sections: [{ id: 'support', content }]
  });

  assert.deepEqual(preview.sections, [{
    id: 'support',
    content: Object.fromEntries(Object.entries(content).filter(([key]) => key !== 'internal_note'))
  }]);
});

test('product proof values survive the controlled live-preview sanitizer', () => {
  const preview = sanitizeCmsLivePreviewRecord('pages', {
    id: 7,
    sections: [{ id: 'proof-efficiency', value: 51, unit: '%', internal_note: 'private' }]
  });

  assert.deepEqual(preview.sections, [{ id: 'proof-efficiency', value: 51, unit: '%' }]);
});

test('page preview retains controlled manufacturing hero copy without exposing private section fields', () => {
  assert.deepEqual(sanitizeCmsLivePreviewRecord('pages', {
    id: 8,
    slug: 'manufacturing',
    sections: [{
      id: 'hero',
      processTitle: 'World\'s top class production process',
      outputText: '年产量可达10000台',
      internal_note: 'private'
    }]
  }), {
    id: 8,
    slug: 'manufacturing',
    sections: [{
      id: 'hero',
      processTitle: 'World\'s top class production process',
      outputText: '年产量可达10000台'
    }]
  });
});

test('page preview retains controlled manufacturing detail copy without exposing private section fields', () => {
  assert.deepEqual(sanitizeCmsLivePreviewRecord('pages', {
    id: 8,
    slug: 'manufacturing',
    sections: [{
      id: 'precision-machining',
      detail: '核心设备：五面体龙门、五轴数控、立式、卧式等',
      internal_note: 'private'
    }]
  }), {
    id: 8,
    slug: 'manufacturing',
    sections: [{
      id: 'precision-machining',
      detail: '核心设备：五面体龙门、五轴数控、立式、卧式等'
    }]
  });
});

test('page preview retains controlled manufacturing process-node copy without private fields', () => {
  assert.deepEqual(sanitizeCmsLivePreviewRecord('pages', {
    id: 8,
    slug: 'manufacturing',
    sections: [{
      id: 'process',
      items: [{
        title: '精密加工基准',
        description: '控制关键基准与精度。',
        anchor: 'top-left',
        connection_label: '进入装配',
        sort_order: 2,
        internal_note: 'private'
      }]
    }]
  }), {
    id: 8,
    slug: 'manufacturing',
    sections: [{
      id: 'process',
      items: [{
        title: '精密加工基准',
        description: '控制关键基准与精度。',
        anchor: 'top-left',
        connection_label: '进入装配',
        sort_order: 2
      }]
    }]
  });
});

test('live preview retains article media and approved global contacts while stripping private fields', () => {
  assert.deepEqual(sanitizeCmsLivePreviewRecord('articles', { title: '资讯', transcript: '视频字幕', media: [{ media_asset_id: 'cover' }], private_note: 'x' }), {
    title: '资讯', transcript: '视频字幕', media: [{ media_asset_id: 'cover' }]
  });
  assert.deepEqual(sanitizeCmsLivePreviewRecord('site_settings', { contacts: { domestic_phone: '123' }, private_note: 'x' }), {
    contacts: { domestic_phone: '123' }
  });
});

test('service resource live preview retains protected scalar media identities without private fields', () => {
  assert.deepEqual(sanitizeCmsLivePreviewRecord('service_resources', {
    id: 97,
    title: '设备维护手册',
    asset: '/api/preview/media/97',
    cover_asset: '/api/preview/media/98',
    asset_media_asset_id: '97',
    cover_media_asset_id: '98',
    source_document: 'private.pdf'
  }), {
    id: 97,
    title: '设备维护手册',
    asset: '/api/preview/media/97',
    cover_asset: '/api/preview/media/98',
    asset_media_asset_id: '97',
    cover_media_asset_id: '98'
  });
});

test('article live preview keeps only presentation fields bound by visible news content', () => {
  const preview = sanitizeCmsLivePreviewRecord('articles', {
    title: '资讯',
    field_presentation: {
      title: { layout: { enabled: true, desktop: { offset_x: 3, offset_y: 0 } }, text_style: { enabled: true, size_desktop: 26, color: '#C62828', css: 'position:fixed' } },
      private_note: { text_style: { enabled: true, size_desktop: 120 } }
    },
    private_note: 'x'
  });

  assert.equal(preview.field_presentation.title.layout.desktop.offset_x, 3);
  assert.equal(preview.field_presentation.title.text_style.size_desktop, 26);
  assert.equal(preview.field_presentation.title.text_style.color, '#C62828');
  assert.equal(Object.hasOwn(preview.field_presentation.title.text_style, 'css'), false);
  assert.equal(Object.hasOwn(preview.field_presentation, 'private_note'), false);
  assert.equal(Object.hasOwn(preview, 'private_note'), false);
});

test('product series live preview retains only name and positioning presentation', () => {
  const preview = sanitizeCmsLivePreviewRecord('product_series', {
    id: 1,
    name: '灵动切割工作站',
    presentation: {
      field_presentation: {
        name: { layout: { enabled: true, desktop: { offset_x: 3, offset_y: 0 } }, text_style: { enabled: true, size_desktop: 26, line_height: 1.4, color: '#C62828', css: 'position:fixed' } },
        positioning: { layout: { enabled: true, desktop: { offset_x: 4, offset_y: 0 } }, text_style: { enabled: true, size_desktop: 18, line_height: 1.4, color: '#C62828', css: 'position:fixed' } },
        private_note: { text_style: { enabled: true, size_desktop: 120 } }
      }
    }
  });

  assert.equal(preview.presentation.field_presentation.name.layout.desktop.offset_x, 3);
  assert.equal(preview.presentation.field_presentation.name.text_style.size_desktop, 26);
  assert.equal(Object.hasOwn(preview.presentation.field_presentation.name.text_style, 'css'), false);
  assert.equal(preview.presentation.field_presentation.positioning.layout.desktop.offset_x, 4);
  assert.equal(preview.presentation.field_presentation.positioning.text_style.size_desktop, 18);
  assert.equal(Object.hasOwn(preview.presentation.field_presentation.positioning.text_style, 'css'), false);
  assert.equal(Object.hasOwn(preview.presentation.field_presentation, 'private_note'), false);
});

test('live preview retains only controlled field presentation settings for scalar page copy', () => {
  const preview = sanitizeCmsLivePreviewRecord('pages', {
    id: 1,
    sections: [{
      id: 'product-task',
      title: '选型咨询',
      field_presentation: {
        title: { layout: { enabled: true, desktop: { offset_x: 6, offset_y: -2 }, script: 'bad' }, text_style: { enabled: true, size_desktop: 42, color: '#E60012', css: 'bad' } },
        internal_note: { layout: { enabled: true } }
      },
      private_note: 'never send'
    }]
  });
  assert.deepEqual(preview.sections[0].field_presentation, {
    title: {
      layout: { enabled: true, desktop: { offset_x: 6, offset_y: -2 }, mobile: { offset_x: 0, offset_y: 0 }, template: 'default', align_x: 'left', align_y: 'top', width: 'normal', gap: 'medium', order: 0, z_index: 0 },
      text_style: { enabled: true, preset: 'inherit', weight: 400, size_desktop: 42, size_mobile: 0, line_height: 1.4, color: '#E60012', max_width: 'normal' },
      responsive: { enabled: false, desktop_visible: true, tablet_visible: true, mobile_visible: true, mobile_template: 'inherit' },
      media_presentation: { enabled: false, fit: 'cover', focal_x: 50, focal_y: 50, overlay: 'none', poster_asset_id: '' }
    }
  });
});

test('live preview retains a repeated card item\'s bounded typography and position settings', () => {
  const preview = sanitizeCmsLivePreviewRecord('pages', {
    id: 3,
    sections: [{
      id: 'support-actions',
      items: [{
        title: '服务流程与寄修',
        layout: { enabled: true, desktop: { offset_x: 8, offset_y: -3 }, css: 'position:fixed' },
        text_style: { enabled: true, size_desktop: 23, weight: 700, line_height: 1.2, color: '#C62828', css: 'font-size:999px' }
      }]
    }]
  });
  const item = preview.sections[0].items[0];
  assert.equal(item.layout.desktop.offset_x, 8);
  assert.equal(item.text_style.size_desktop, 23);
  assert.equal(item.text_style.weight, 700);
  assert.equal(item.text_style.color, '#C62828');
  assert.equal(Object.hasOwn(item.text_style, 'css'), false);
});

test('visual editing binding metadata supports exact nested fields and governed media roles', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(source, /dataset\.cmsPreviewFieldPath/);
  assert.match(source, /dataset\.cmsPreviewMediaRole/);
  assert.match(source, /CMS_LIVE_PREVIEW_EDIT_COMMIT/);
  assert.match(source, /ruijun:cms-preview:media-replace/);
  assert.match(source, /fieldPath/);
  assert.match(source, /collection/);
  assert.match(source, /itemId/);
  assert.doesNotMatch(source, /\(title\|heading\|headline\|name\)/);
  assert.doesNotMatch(source, /dataset\.cmsPreviewField = 'title'/);
  assert.match(source, /dataset\.cmsPreviewCollection/);
  assert.match(source, /dataset\.cmsPreviewItemId/);
  assert.match(source, /data-cms-preview-collection/);
  assert.match(source, /data-cms-preview-item-id/);
  assert.match(source, /payload\.collection/);
  assert.match(source, /payload\.itemId/);
  assert.match(source, /textStyle/);
  assert.match(source, /lineHeight/);
  assert.match(source, /textColor/);
  assert.match(source, /positionFieldPath/);
  assert.match(source, /offsetDelta/);
  assert.match(source, /function handleVisualClick\(event: MouseEvent\)/);
  assert.match(source, /const visualRuntimeOwners = new Set<CmsVisualRuntimeOwner>\(\)/);
  assert.match(source, /function installVisualRuntimeBridge\(\)/);
  assert.match(source, /document\.addEventListener\('click', dispatchVisualClick, true\)/);
  assert.match(source, /registerVisualRuntimeOwner\(visualRuntimeOwner\)/);
  assert.match(source, /unregisterVisualRuntimeOwner\(visualRuntimeOwner\)/);
  assert.doesNotMatch(source, /document\.addEventListener\('click', handleVisualClick, true\)/);
});

test('visual editing captures legacy card interactions and prefers a text binding outside media mode', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(source, /function editableTarget\(node: EventTarget \| null, clientX = NaN, clientY = NaN\)[\s\S]*visualTool\.value === 'media'/);
  assert.match(source, /function handleVisualClick\(event: MouseEvent\) \{[\s\S]*event\.preventDefault\(\);[\s\S]*event\.stopPropagation\(\);/);
});

test('visual editing routes disabled bound buttons through canvas hit testing without enabling public controls', async () => {
  const [preview, app] = await Promise.all([
    (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8'),
    (await import('node:fs/promises')).readFile(new URL('../app.vue', import.meta.url), 'utf8')
  ]);
  assert.match(app, /html\[data-cms-preview-edit-mode="true"\] button:disabled\[data-cms-preview-editable="true"\]\[data-cms-preview-text="true"\] \{\s*pointer-events: none;/);
  assert.match(preview, /function editableTarget\(node: EventTarget \| null, clientX = NaN, clientY = NaN\) \{[\s\S]*controlledVisualElementAtPoint\(clientX, clientY\)/);
  assert.doesNotMatch(preview, /function handleVisualPointerDown\(event: PointerEvent\) \{[\s\S]*button:disabled\[data-cms-preview-editable="true"\]\[data-cms-preview-text="true"\]/);
});

test('media mode resolves a uniquely bound image inside an interactive product card', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(source, /function mediaBindingInInteractiveContainer\(source: HTMLElement \| null\)/);
  assert.match(source, /\[data-cms-preview-editable="true"\]\[data-cms-preview-media-role\]/);
  assert.match(source, /if \(visualTool\.value === 'media'\) element = mediaBindingInInteractiveContainer\(source\) \|\| element;/);
});

test('visual editing decorates bold homepage reason titles as selectable text', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(source, /h1,h2,h3,h4,h5,h6,p,b,strong,em,small,span,time,button,a,input,textarea,li,div\[data-cms-preview-field-path\],img,video,dt,dd/);
});

test('visual editing decorates a bound FAQ summary and any explicitly bound element', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(source, /dt,dd,summary,\[data-cms-preview-field-path\],\[data-cms-preview-field\]/);
});

test('visual editing decorates bound anchor CTAs before resolving their button-type edit request', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(source, /h1,h2,h3,h4,h5,h6,p,b,strong,em,small,span,time,button,a,input,textarea,li,div\[data-cms-preview-field-path\],img,video,dt,dd/);
  assert.match(source, /element\.matches\('button,a'\) \? 'button' : 'text'/);
});

test('visual editing decorates a bound input placeholder without enabling ordinary form entry', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(source, /h1,h2,h3,h4,h5,h6,p,b,strong,em,small,span,time,button,a,input,textarea,li,div\[data-cms-preview-field-path\],img,video,dt,dd/);
  assert.match(source, /function handleVisualClick\(event: MouseEvent\) \{[\s\S]*event\.preventDefault\(\);[\s\S]*event\.stopPropagation\(\);/);
});

test('visual editing decorates a bound list item without treating its parent list as a field', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(source, /h1,h2,h3,h4,h5,h6,p,b,strong,em,small,span,time,button,a,input,textarea,li,div\[data-cms-preview-field-path\],img,video,dt,dd/);
  assert.doesNotMatch(source, /querySelectorAll<HTMLElement>\('h1,h2,h3,h4,h5,h6,p,b,strong,em,small,span,time,button,a,input,textarea,ul,img/);
});

test('visual editing decorates an explicitly bound emphasis element before its heading parent', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(source, /h1,h2,h3,h4,h5,h6,p,b,strong,em,small,span,time,button,a,input,textarea,li,div\[data-cms-preview-field-path\],img,video,dt,dd/);
});

test('homepage hero CMS copy becomes clickable only while the preview canvas is in edit mode', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');
  assert.match(source, /\.hero-cms-copy\{[\s\S]*pointer-events:none/);
  assert.match(source, /html\[data-cms-preview-edit-mode="true"\] \.hero-cms-copy \[data-cms-preview-editable="true"\]\{pointer-events:auto;cursor:text\}/);
});

test('canvas pointer capture treats an unmoved media press as a selection', async () => {
  const preview = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(preview, /if \(Math\.abs\(dx\) < 2 && Math\.abs\(dy\) < 2\) \{\s*requestVisualSelection\(\{ element: state\.element, sectionKey: state\.sectionKey \}, event\);\s*return;/);
});

test('homepage keeps its visible fallback CTA bound to the real label and href fields', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');
  assert.match(source, /class="hero-ended-link"[^>]+data-cms-preview-field-path="label"[^>]+data-cms-preview-link-field-path="href"/);
  assert.match(source, /\{\{ heroContent\.label \|\| '了解更多' \}\}/);
});

test('homepage product-task CTA exposes both its label and href to visual editing', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');
  assert.match(source, /<NuxtLink :to="productTask\.href \|\| '\/contact'"[^>]+data-cms-preview-field-path="label"[^>]+data-cms-preview-link-field-path="href"/);
});

test('homepage history preserves its visible kicker and hint fields for live preview', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');
  assert.match(source, /resolvePageSection\(pageContent\.value, 'history', \{\s*title: '瑞钧智科的中走丝制造历史',\s*kicker: '',\s*label: '',\s*media: \[\]/);
});

test('brand story date copy rises above its text panel only in visual edit mode', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../pages/about.vue', import.meta.url), 'utf8');
  assert.match(source, /html\[data-cms-preview-edit-mode="true"\] \.about-story \.legacy-copy\{z-index:5;pointer-events:none\}/);
  assert.match(source, /html\[data-cms-preview-edit-mode="true"\] \.about-story \.legacy-copy \[data-cms-preview-editable="true"\]\{position:relative;z-index:5;pointer-events:auto;cursor:text\}/);
});

test('brand story paragraphs select one safe body field instead of fabricated indexed paths', async () => {
  const page = await (await import('node:fs/promises')).readFile(new URL('../pages/about.vue', import.meta.url), 'utf8');
  const preview = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(page, /class="legacy-story cms-positioned"[^>]*data-cms-preview-field-path="body"[^>]*data-cms-preview-inline-edit="false"/);
  assert.doesNotMatch(page, /:data-cms-preview-field-path="`body\.\$\{index\}`"/);
  assert.match(preview, /textarea,li,div\[data-cms-preview-field-path\],img,video,dt,dd/);
  assert.match(preview, /target\.element\.dataset\.cmsPreviewInlineEdit !== 'false'/);
});

test('about timeline page fields use their actual workbench section entry in the reusable browser verifier', async () => {
  const verifier = await (await import('node:fs/promises')).readFile(new URL('../../output/playwright/verify-news-hero-caption-e2e.cjs', import.meta.url), 'utf8');
  assert.match(verifier, /about: \{[^\n]*entries: \{[^\n]*history: '发展历程标题'/);
  assert.match(verifier, /'body', 'kicker', 'label'/);
});

test('about timeline declares the visible kicker and hint fields in its section fallback', async () => {
  const page = await (await import('node:fs/promises')).readFile(new URL('../pages/about.vue', import.meta.url), 'utf8');
  assert.match(page, /resolvePageSection\(pageContent\.value, 'history', \{/);
  assert.match(page, /kicker: "The Development/);
  assert.match(page, /label: 'SCROLL TO EXPLORE'/);
});

test('product hero title and kicker have separate direct canvas bindings', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8');
  assert.match(source, /<h1 id="product-overview-title"[^>]*>\s*<span[^>]*data-cms-preview-field-path="title"[^>]*>\{\{ overviewCopy\.title \}\}<\/span>\s*<span[^>]*data-cms-preview-field-path="kicker"[^>]*>\{\{ overviewCopy\.kicker \}\}<\/span>\s*<\/h1>/);
});

test('product hero title and kicker keep independent field-level presentation bindings', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8');
  assert.match(source, /<span v-bind="fieldPresentationAttributes\(overviewCopy, 'title'\)" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation\.title">\{\{ overviewCopy\.title \}\}<\/span>/);
  assert.match(source, /<span v-bind="fieldPresentationAttributes\(overviewCopy, 'kicker'\)" data-cms-preview-field-path="kicker" data-cms-preview-position-field-path="field_presentation\.kicker">\{\{ overviewCopy\.kicker \}\}<\/span>/);
});

test('product categories title exposes field-level presentation controls on the visual canvas', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8');
  assert.match(source, /<span class="cms-styled-text" v-bind="fieldPresentationAttributes\(categoriesCopy, 'title'\)" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation\.title">\{\{ categoriesCopy\.title \}\}<\/span>/);
});

test('product categories kicker keeps an independent field-level presentation binding', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8');
  assert.match(source, /<b v-bind="fieldPresentationAttributes\(categoriesCopy, 'kicker'\)" data-cms-preview-field-path="kicker" data-cms-preview-position-field-path="field_presentation\.kicker">\{\{ categoriesCopy\.kicker \|\| '3大' \}\}<\/b>/);
});

test('product dimensions notice keeps an independent field-level presentation binding', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8');
  assert.match(source, /const dimensionsCopy = computed\(\(\) => productSection\('dimensions', \{ title: '尺寸与资料', body: '注：1\.表中所述加工性能参数/);
  assert.match(source, /<p v-bind="fieldPresentationAttributes\(dimensionsCopy, 'body'\)" data-cms-preview-field-path="body" data-cms-preview-position-field-path="field_presentation\.body">\{\{ dimensionsCopy\.body \|\| '注：1\.表中所述加工性能参数/);
});

test('product technical parameter side label declares the same governed media placement as product dimensions', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8');
  assert.match(source, /data-cms-preview-field-path="'configuration\.labels\.technical_image_asset_id'" data-cms-preview-placement-key="product\.gallery\.image" data-cms-preview-media-role="technical"/);
});

test('homepage visual editing keeps the governed hero video selectable before or after its public intro completes', async () => {
  const [source, preview] = await Promise.all([
    (await import('node:fs/promises')).readFile(new URL('../pages/index.vue', import.meta.url), 'utf8'),
    (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8')
  ]);
  assert.match(preview, /return \{ enabled, session, record, error, liveConnected, livePreviewLabel, visualEditMode,/);
  assert.match(source, /visualEditMode: cmsVisualEditMode/);
  assert.match(source, /v-if="heroState\.videoVisible && \(!videoCompleted \|\| videoFading\) \|\| cmsVisualEditMode"/);
  assert.match(source, /data-cms-preview-field-path="hero_video_asset_id" data-cms-preview-placement-key="home\.hero\.video" data-cms-preview-media-role="video"/);
  assert.match(source, /data-cms-preview-media-role="video" data-cms-preview-allow-default="true"/);
  assert.match(source, /const previewHeroVideoSource = computed\(\(\) => \{/);
  assert.match(source, /heroVideoSource = computed\(\(\) => previewHeroVideoSource\.value \|\| heroContent\.value\.video/);
  assert.match(source, /<video[^>]*:src="heroVideoSource"/);
  assert.doesNotMatch(source, /<source :src="heroVideoSource" type="video\/mp4"><\/video>/);
});

test('product workspace separates page dimensions copy from model parameters', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../../cms/extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(source, /\{ key: 'product-dimensions', label: '尺寸与资料说明', sectionKey: 'dimensions' \}/);
  assert.match(source, /\{ key: 'product-parameters', label: '产品型号、参数与尺寸图', action: 'models' \}/);
});

test('visual editing resolves a uniquely bound text child when an interactive wrapper receives the click', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(source, /const interactiveContainer = source\?\.closest<HTMLElement>\('button,a,\[role="button"\]'\)/);
  assert.match(source, /const textBindings = \[\.\.\.interactiveContainer\.querySelectorAll<HTMLElement>\('\[data-cms-preview-editable="true"\]\[data-cms-preview-text="true"\]'\)\]/);
  assert.match(source, /if \(textBindings\.length === 1\) element = textBindings\[0\];/);
});

test('visual editing promotes one explicit child text binding to its interactive wrapper without making fieldless roots editable', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(source, /function promoteUniqueVisualTextBinding\(element: HTMLElement\)/);
  assert.match(source, /const nestedBindings = \[\.\.\.element\.querySelectorAll<HTMLElement>\('\[data-cms-preview-field-path\], \[data-cms-preview-field\]'\)\]/);
  assert.match(source, /if \(nestedBindings\.length !== 1\) return;/);
  assert.match(source, /if \(!fieldPath && !mediaRole\) continue;/);
});

test('visual editing marks fieldless static media as read-only instead of presenting it as replaceable', async () => {
  const [preview, workbench, app] = await Promise.all([
    (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8'),
    (await import('node:fs/promises')).readFile(new URL('../../cms/extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8'),
    (await import('node:fs/promises')).readFile(new URL('../app.vue', import.meta.url), 'utf8')
  ]);
  assert.match(preview, /data-cms-preview-readonly/);
  assert.match(preview, /media-pending/);
  assert.match(preview, /CMS_LIVE_PREVIEW_READONLY/);
  assert.match(workbench, /ruijun:cms-preview:readonly/);
  assert.match(workbench, /selectedVisualElement\.readonly/);
  assert.match(workbench, /请先在媒体资产中导入、审核并发布后再替换/);
  assert.match(app, /data-cms-preview-readonly="media-pending"/);
});

test('a static background does not block a bound text child from visual editing', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(source, /function readonlyVisualTarget\(node: EventTarget \| null\) \{[\s\S]*?const editable = source\?\.closest<HTMLElement>\('\[data-cms-preview-editable="true"\]'\);[\s\S]*?if \(editable\) return null;/);
});

test('read-only canvas targets can provide a specific CMS modelling reason', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(source, /source\?\.closest\?\.<HTMLElement>\('\[data-cms-preview-readonly\]'\)/);
  assert.match(source, /readonlyReason: String\(readonly\.element\.dataset\.cmsPreviewReadonlyReason \|\| '此为静态素材；请先在媒体资产中导入、审核并发布后再替换。'\)/);
});

test('a static background does not inherit disabled semantics into a bound CTA child', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(source, /function hasBoundVisualDescendant\(element: HTMLElement\)/);
  assert.match(source, /if \(hasBoundVisualDescendant\(element\)\) \{\s*element\.removeAttribute\('aria-disabled'\);\s*\} else \{\s*element\.setAttribute\('aria-disabled', 'true'\);\s*\}/);
});

test('visual click selection creates an exact bound edit request', () => {
  assert.deepEqual(createCmsVisualEditRequest({
    editMode: true,
    device: 'desktop',
    tool: 'select',
    sectionKey: 'core-equipment',
    meta: {
      label: '第 3 张设备图',
      collection: 'manufacturing_evidence',
      itemId: '3',
      fieldPath: 'media.2',
      positionFieldPath: 'media.2.layout',
      elementType: 'image',
      mediaRole: 'image',
      placementKey: 'equipment-3'
    }
  }), {
    type: 'ruijun:cms-preview:edit-request',
    sectionKey: 'core-equipment',
    field: 'media.2',
    fieldPath: 'media.2',
    label: '第 3 张设备图',
    collection: 'manufacturing_evidence',
    itemId: '3',
    positionFieldPath: 'media.2.layout',
    elementType: 'image',
    mediaRole: 'image',
    placementKey: 'equipment-3'
  });

  assert.equal(createCmsVisualEditRequest({
    editMode: true,
    device: 'desktop',
    tool: 'media',
    sectionKey: 'dimensions',
    meta: {
      label: 'FL1610 尺寸图',
      collection: 'product_models',
      itemId: '17',
      fieldPath: 'configuration.drawings.0.media_asset_id',
      elementType: 'image',
      mediaRole: 'drawing',
      placementKey: 'product.gallery.image'
    }
  })?.placementKey, 'product.gallery.image');
  assert.equal(createCmsVisualEditRequest({
    editMode: true,
    device: 'desktop',
    tool: 'media',
    sectionKey: 'dimensions',
    meta: {
      collection: 'product_models',
      itemId: '17',
      fieldPath: 'configuration.drawings.0.media_asset_id',
      elementType: 'image',
      mediaRole: 'drawing',
      placementKey: 'product..gallery'
    }
  }), null);
});

test('visual media requests preserve an explicit default-media restore capability', () => {
  const request = createCmsVisualEditRequest({
    editMode: true,
    device: 'desktop',
    tool: 'media',
    sectionKey: 'hero',
    meta: {
      label: '首屏背景', collection: 'pages', itemId: '3', fieldPath: 'media.0',
      elementType: 'image', mediaRole: 'background', mediaSlot: 'background',
      placementKey: 'service.hero.image', allowDefaultMedia: true
    }
  });

  assert.equal(request?.allowDefaultMedia, true);
  assert.equal(createCmsVisualEditRequest({
    editMode: true, device: 'desktop', tool: 'media', sectionKey: 'hero',
    meta: { label: '首屏背景', collection: 'pages', itemId: '3', fieldPath: 'media.0', elementType: 'image', mediaRole: 'background', allowDefaultMedia: 'true' }
  })?.allowDefaultMedia, undefined);
});

test('visual button selections carry only an explicitly safe destination field path', () => {
  const button = {
    collection: 'pages', itemId: '1', fieldPath: 'label', linkFieldPath: 'href',
    elementType: 'button', label: '首屏行动按钮'
  };
  assert.equal(createCmsVisualEditRequest({ editMode: true, device: 'desktop', tool: 'select', sectionKey: 'hero', meta: button })?.linkFieldPath, 'href');
  assert.equal(createCmsVisualEditRequest({ editMode: true, device: 'desktop', tool: 'select', sectionKey: 'hero', meta: { ...button, linkFieldPath: '__proto__.href' } }), null);
  assert.equal(createCmsVisualEditRequest({ editMode: true, device: 'desktop', tool: 'select', sectionKey: 'hero', meta: { ...button, elementType: 'text' } }), null);
});

test('visual parameter-group selections carry only a bounded list of related record ids', () => {
  const meta = {
    collection: 'product_parameters', itemId: '8', fieldPath: 'group_name', elementType: 'text', label: '基础参数',
    groupRecordIds: ['8', '9']
  };
  assert.deepEqual(createCmsVisualEditRequest({ editMode: true, device: 'desktop', tool: 'select', sectionKey: 'parameters', meta })?.groupRecordIds, ['8', '9']);
  assert.equal(createCmsVisualEditRequest({ editMode: true, device: 'desktop', tool: 'select', sectionKey: 'parameters', meta: { ...meta, groupRecordIds: ['8', '../9'] } }), null);
  assert.equal(createCmsVisualEditRequest({ editMode: true, device: 'desktop', tool: 'select', sectionKey: 'parameters', meta: { ...meta, groupRecordIds: Array.from({ length: 33 }, (_, index) => String(index + 1)) } }), null);
});

test('visual click selection respects text and media tools', () => {
  const text = { collection: 'pages', itemId: '7', fieldPath: 'sections.0.title', elementType: 'text', label: '标题' };
  const image = { collection: 'pages', itemId: '7', fieldPath: 'sections.0.media.0', elementType: 'image', mediaRole: 'image', label: '背景图' };
  const footerLogo = { collection: 'site_settings', itemId: '1', fieldPath: 'brand.footer_logo_asset', elementType: 'image', mediaRole: 'logo', label: '页脚品牌图' };
  const technicalImage = { collection: 'product_models', itemId: '15', fieldPath: 'configuration.labels.technical_image_asset_id', elementType: 'image', mediaRole: 'technical', label: '技术参数侧边图' };
  const drawingImage = { collection: 'product_models', itemId: '15', fieldPath: 'configuration.drawings.0.media_asset_id', elementType: 'image', mediaRole: 'drawing', label: '工程尺寸图' };
  assert.ok(createCmsVisualEditRequest({ editMode: true, device: 'desktop', tool: 'text', sectionKey: 'hero', meta: text }));
  assert.equal(createCmsVisualEditRequest({ editMode: true, device: 'desktop', tool: 'media', sectionKey: 'hero', meta: text }), null);
  assert.ok(createCmsVisualEditRequest({ editMode: true, device: 'desktop', tool: 'media', sectionKey: 'hero', meta: image }));
  assert.ok(createCmsVisualEditRequest({ editMode: true, device: 'desktop', tool: 'media', sectionKey: 'site-footer', meta: footerLogo }));
  assert.ok(createCmsVisualEditRequest({ editMode: true, device: 'desktop', tool: 'media', sectionKey: 'parameters', meta: technicalImage }));
  assert.ok(createCmsVisualEditRequest({ editMode: true, device: 'desktop', tool: 'media', sectionKey: 'dimensions', meta: drawingImage }));
  assert.equal(createCmsVisualEditRequest({ editMode: true, device: 'desktop', tool: 'text', sectionKey: 'hero', meta: image }), null);
});

test('visual click selection is PC-only and requires a complete Directus binding', () => {
  const bound = { collection: 'pages', itemId: '7', fieldPath: 'sections.0.title', elementType: 'text', label: '标题' };
  assert.equal(createCmsVisualEditRequest({ editMode: false, device: 'desktop', tool: 'select', sectionKey: 'hero', meta: bound }), null);
  assert.equal(createCmsVisualEditRequest({ editMode: true, device: 'mobile', tool: 'select', sectionKey: 'hero', meta: bound }), null);
  assert.equal(createCmsVisualEditRequest({ editMode: true, device: 'desktop', tool: 'select', sectionKey: 'hero', meta: { ...bound, collection: '' } }), null);
  assert.equal(createCmsVisualEditRequest({ editMode: true, device: 'desktop', tool: 'select', sectionKey: 'hero', meta: { ...bound, itemId: '' } }), null);
  assert.equal(createCmsVisualEditRequest({ editMode: true, device: 'desktop', tool: 'select', sectionKey: 'hero', meta: { ...bound, fieldPath: '' } }), null);
  assert.equal(createCmsVisualEditRequest({ editMode: true, device: 'desktop', tool: 'select', sectionKey: 'x\"],iframe', meta: bound }), null);
});

test('visual editing uses the CMS-selected canvas device instead of the scaled iframe viewport', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(source, /event\.data\?\.device/);
  assert.match(source, /visualDevice/);
  assert.match(source, /visualDevice\.value === 'desktop'/);
});

test('visual canvas installs selection listeners before the asynchronous preview session is ready', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(source, /onMounted\(\(\) => \{\s*registerVisualRuntimeOwner\(visualRuntimeOwner\);/);
  assert.match(source, /function installVisualRuntimeBridge\(\)[\s\S]*document\.addEventListener\('click', dispatchVisualClick, true\);/);
  assert.match(source, /watch\(enabled, \(isEnabled\) => \{\s*if \(!isEnabled \|\| activeVisualRuntimeOwner !== visualRuntimeOwner\) return;\s*notifyPreviewParent\(\);/);
});

test('a visual runtime owner decorates already-rendered fields when it takes over the shared bridge', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(source, /function startVisualRuntime\(\) \{[\s\S]*?decorateVisualEditing\(\);[\s\S]*?visualEditingObserver = new MutationObserver/);
});

test('every content overlay directly tracks the Nuxt live preview state', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(source, /function currentPreviewRecord\(collection\?: string\)[\s\S]*liveRecord\.value/);
  assert.match(source, /const record = computed\(\(\) => currentPreviewRecord\(\)\);/);
  assert.doesNotMatch(source, /computed\(currentPreviewRecord\)/);
  assert.match(source, /function overlayRecord[\s\S]*const draft = currentPreviewRecord\(collection\);/);
  assert.match(source, /function currentPreviewRecords\(collection: string\)/);
  assert.match(source, /function overlayList[\s\S]*const drafts = currentPreviewRecords\(collection\);/);
  assert.match(source, /preview\.related\?\./);
  assert.doesNotMatch(source, /clientLiveRecord/);
  assert.doesNotMatch(source, /liveRevision/);
  assert.match(source, /liveRelatedRecords/);
  assert.match(source, /const publishedRecords = Array\.isArray\(published\) \? published : \[\];/);
  assert.doesNotMatch(source, /data\.value = data\.value/);
});

test('a collection-rooted preview retains its related record list so the canvas can switch records', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(source, /function currentPreviewRecords\(collection: string\) \{[\s\S]*const related = session\.value\.preview\.related\?\.\[collection\];[\s\S]*if \(session\.value\.collection !== collection\) return relatedRecords;/);
  assert.match(source, /sameRecord\(collection, item, primary\)/);
  assert.match(source, /if \(String\(event\.data\?\.collection \|\| ''\) === String\(session\.value\?\.collection \|\| ''\)\) \{\s*liveRecord\.value = preview;/);
});

test('homepage exposes nonvisual live-preview render diagnostics', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');
  assert.match(source, /const \{ enabled: cmsPreviewEnabled, record: cmsPreviewRecord, recordsFor: cmsPreviewRecords, visualEditMode: cmsVisualEditMode \} = useCmsDraftPreview\(\);/);
  assert.match(source, /const pageContent = shallowRef<Record<string, any> \| null>\(null\);/);
  assert.match(source, /watchEffect\(\(\) => \{[\s\S]*const draft = cmsPreviewRecord\.value;[\s\S]*const currentPage = !draft \|\| draft\.slug !== 'home'[\s\S]*pageContent\.value = currentPage;[\s\S]*rebuildHomepageDerivedContent\(currentPage\);[\s\S]*\}\);/);
  assert.match(source, /const reasons = shallowRef<Array<Record<string, any>>>\(\[\]\);/);
  assert.match(source, /const marqueeItems = shallowRef<Array<Record<string, any>>>\(\[\]\);/);
  assert.match(source, /function rebuildHomepageDerivedContent\(currentPage[\s\S]*reasons\.value = resolvedReasons;[\s\S]*marqueeItems\.value =/);
  assert.match(source, /watchEffect\(\(\) => \{[\s\S]*cmsPreviewHomeRecordBody[\s\S]*cmsPreviewHomePageBody[\s\S]*cmsPreviewHomeReasonBody[\s\S]*cmsPreviewHomeMarqueeBody/);
  assert.match(source, /if \(!import\.meta\.client \|\| !cmsPreviewEnabled\.value\) return;/);
});

test('homepage rebuilds derived reasons from the same page snapshot as live preview', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');
  assert.match(source, /function rebuildHomepageDerivedContent\(currentPage/);
  assert.match(source, /pageContent\.value = currentPage;[\s\S]*rebuildHomepageDerivedContent\(currentPage\);/);
  assert.doesNotMatch(source, /watch\(\[pageContent, cmsPreviewRecord\]/);
});

test('homepage preview renders controlled milestone records issued with the page token', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');
  assert.match(source, /const \{ enabled: cmsPreviewEnabled, record: cmsPreviewRecord, recordsFor: cmsPreviewRecords, visualEditMode: cmsVisualEditMode \} = useCmsDraftPreview\(\);/);
  assert.match(source, /const previewRecords = cmsPreviewEnabled\.value \? cmsPreviewRecords\('milestones'\) : \[\];/);
  assert.match(source, /const records = previewRecords\.length \? previewRecords : publishedRecords;/);
});

test('cross-collection preview decorates only roots with an explicit collection and real id', () => {
  assert.deepEqual(resolveCmsVisualRootBinding({ rootCollection: 'service_locations', rootItemId: '1', sessionCollection: 'service_locations', sessionItemId: '1' }), { collection: 'service_locations', itemId: '1' });
  assert.equal(resolveCmsVisualRootBinding({ sessionCollection: 'service_locations', sessionItemId: '1' }), null);
  assert.deepEqual(resolveCmsVisualRootBinding({ sessionCollection: 'pages', sessionItemId: '7' }), { collection: 'pages', itemId: '7' });
  assert.equal(resolveCmsVisualRootBinding({ rootCollection: 'service_locations', rootItemId: '2', sessionCollection: 'service_locations', sessionItemId: '1' }), null);
});

test('visual preview decorates an explicit nested collection root inside a page session', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(source, /resolveCmsVisualRootBinding\([\s\S]*?\)\s*\|\|\s*resolveCmsVisualElementBinding\(/);
});

test('CMS edit mode lets a bound canvas field receive clicks beneath the fixed website header', async () => {
  const app = await (await import('node:fs/promises')).readFile(new URL('../app.vue', import.meta.url), 'utf8');

  assert.match(app, /html\[data-cms-preview-edit-mode="true"\] \.site-header\s*\{\s*pointer-events: none;/);
});

test('about timeline keeps editable milestone text above the history title only in CMS edit mode', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../pages/about.vue', import.meta.url), 'utf8');
  const preview = await (await import('node:fs/promises')).readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8');
  assert.match(preview, /document\.documentElement\.dataset\.cmsPreviewTargetKey = targetKey/);
  assert.match(preview, /function requestVisualSelection\(target: \{ element: HTMLElement; sectionKey: string \}, event: MouseEvent \| PointerEvent\) \{[\s\S]*document\.documentElement\.dataset\.cmsPreviewTargetKey = target\.sectionKey;/);
  assert.match(preview, /function handleVisualClick\(event: MouseEvent\) \{[\s\S]*requestVisualSelection\(target, event\);/);
  assert.match(preview, /const timelineSection = preferredElement\?\.closest<HTMLElement>\('#history\[data-cms-preview-key\]'\);/);
  assert.match(preview, /function controlledVisualElementAtPoint\(clientX: number, clientY: number\)/);
  assert.match(preview, /const target = editableTarget\(event\.target, event\.clientX, event\.clientY\);/);
  assert.match(source, /html\[data-cms-preview-edit-mode="true"\] \.about-history\{z-index:20\}/);
  assert.match(source, /html\[data-cms-preview-edit-mode="true"\]\[data-cms-preview-target-key="history"\] \.about-overview\{pointer-events:none\}/);
  assert.match(source, /html\[data-cms-preview-edit-mode="true"\] \.about-history \.history-viewport\{z-index:6\}/);
  assert.match(source, /html\[data-cms-preview-edit-mode="true"\] \.about-history \.history-event\{position:relative;z-index:6\}/);
});

test('visual element metadata prefers the nearest nested CMS root binding', () => {
  assert.deepEqual(resolveCmsVisualElementBinding({
    elementCollection: 'product_parameters', elementItemId: '9',
    rootCollection: 'pages', rootItemId: '7',
    sessionCollection: 'pages', sessionItemId: '7'
  }), { collection: 'product_parameters', itemId: '9' });
  assert.deepEqual(resolveCmsVisualElementBinding({
    elementCollection: 'pages', elementItemId: '7',
    rootCollection: 'product_series', rootItemId: '1',
    sessionCollection: 'pages', sessionItemId: '7'
  }), { collection: 'product_series', itemId: '1' });
  assert.deepEqual(resolveCmsVisualElementBinding({
    elementCollection: 'pages', elementItemId: '7',
    rootCollection: '', rootItemId: '',
    sessionCollection: 'pages', sessionItemId: '7'
  }), { collection: 'pages', itemId: '7' });
});
