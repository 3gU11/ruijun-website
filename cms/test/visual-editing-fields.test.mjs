import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyVisualMediaReplacement,
  getVisualMediaAssetId,
  getVisualFieldValue,
  hydrateHomeReasonFields,
  hydrateProductProofFields,
  hydrateServiceSupportFields,
  hydrateServiceOfficeFields,
  isVisualMediaSelection,
  getVisualListReorder,
  duplicateVisualListItem,
  moveVisualListItem,
  removeVisualListItem,
  shouldKeepVisualDraft,
  resolveVisualFieldTarget,
  setVisualFieldValue,
  visualFieldMaxLength
} from '../extensions/content-editor-workbench/src/visual-editing-fields.js';

test('canvas media triggers retain replacement controls when the clickable layer is a button', () => {
  assert.equal(isVisualMediaSelection({ elementType: 'image', fieldPath: 'media.0' }), true);
  assert.equal(isVisualMediaSelection({ elementType: 'text', mediaRole: 'background', fieldPath: 'media.0' }), true);
  assert.equal(isVisualMediaSelection({ elementType: 'button', mediaRole: 'equipment', fieldPath: 'media.0' }), true);
  // The Nuxt PSD gallery uses a transparent button as the hit target. The
  // bridge may omit its role during a cross-frame message, but `media.<n>`
  // remains an explicit, safe replacement target.
  assert.equal(isVisualMediaSelection({ elementType: 'button', mediaRole: '', fieldPath: 'media.0' }), true);
  assert.equal(isVisualMediaSelection({ elementType: 'button', mediaRole: 'equipment', fieldPath: 'title' }), false);
});

test('media property controls show the asset already bound to the selected canvas slot', () => {
  assert.equal(getVisualMediaAssetId({ media: [{ media_asset_id: '50', role: 'equipment-1' }] }, 'media.0'), '50');
  assert.equal(getVisualMediaAssetId({ configuration: { drawings: [{ media_asset_id: 27 }] } }, 'configuration.drawings.0'), '27');
  assert.equal(getVisualMediaAssetId({ hero_video_asset_id: '49' }, 'hero_video_asset_id'), '49');
  assert.equal(getVisualMediaAssetId({ footer: { address_icon_asset: 'footer-icon' } }, 'footer.address_icon_asset'), 'footer-icon');
  assert.equal(getVisualMediaAssetId({ title: '生产核心设备' }, 'title'), '');
});

test('service office item media resolves its governed role slot', () => {
  const target = {
    items: [{ image: '', map: '', media_role: 'office-1', map_media_role: 'office-map-1' }],
    media: [
      { role: 'office-1', media_asset_id: '317' },
      { role: 'office-map-1', media_asset_id: '316' }
    ]
  };
  assert.equal(getVisualMediaAssetId(target, 'items.0.image', { mediaSlot: 'office-1' }), '317');
  assert.equal(getVisualMediaAssetId(target, 'items.0.map', { mediaSlot: 'office-map-1' }), '316');
});

test('page visual fields resolve relative to the selected section', () => {
  const record = {
    id: 'home',
    sections: [{ id: 'why-ruijun', items: [{ title: '第一项' }] }]
  };
  const target = resolveVisualFieldTarget(record, { collection: 'pages', sectionKey: 'why-ruijun' });
  assert.equal(target, record.sections[0]);
  assert.equal(getVisualFieldValue(target, 'items.0.title'), '第一项');
  assert.equal(setVisualFieldValue(target, 'items.0.title', '已修改'), true);
  assert.equal(record.sections[0].items[0].title, '已修改');
  assert.equal(record.items, undefined);
});

test('home hero video writes stay in the persisted hero section', () => {
  const record = {
    id: 'home',
    sections: [{ id: 'hero', title: '首页首屏标题', hero_video_asset_id: '' }]
  };
  const target = resolveVisualFieldTarget(record, { collection: 'pages', sectionKey: 'hero', fieldPath: 'hero_video_asset_id' });
  assert.equal(target, record.sections[0]);
  assert.equal(applyVisualMediaReplacement(target, 'hero_video_asset_id', '49'), true);
  assert.equal(record.sections[0].hero_video_asset_id, '49');
  assert.equal(record.hero_video_asset_id, undefined);
});

test('repeated page copy updates only the exact nested item selected on the canvas', () => {
  const record = {
    id: 'service',
    sections: [{
      id: 'hero',
      items: [
        { label: '全球服务网络 原厂备件保障' },
        { label: '国内50多个直属办事处，覆盖全国主要省市' },
        { label: '海外 20 余家长期合作经销商' }
      ]
    }]
  };
  const target = resolveVisualFieldTarget(record, { collection: 'pages', sectionKey: 'hero' });

  assert.equal(getVisualFieldValue(target, 'items.0.label'), '全球服务网络 原厂备件保障');
  assert.equal(setVisualFieldValue(target, 'items.0.label', '全球服务网络与原厂备件保障'), true);
  assert.deepEqual(record.sections[0].items, [
    { label: '全球服务网络与原厂备件保障' },
    { label: '国内50多个直属办事处，覆盖全国主要省市' },
    { label: '海外 20 余家长期合作经销商' }
  ]);
  assert.equal(setVisualFieldValue(target, 'items.1.label', '不应由第一项编辑触及'), true);
  assert.equal(record.sections[0].items[0].label, '全球服务网络与原厂备件保障');
  assert.equal(record.sections[0].items[2].label, '海外 20 余家长期合作经销商');
});

test('office contact field updates only its selected nested address', () => {
  const record = {
    id: 'service',
    sections: [{
      id: 'office-directory',
      items: [{
        title: '外贸商务',
        offices: [{ address: '常熟总部：儒浜路78号', manager: '吴龙经理', phone: '18050194994' }]
      }]
    }]
  };
  const target = resolveVisualFieldTarget(record, { collection: 'pages', sectionKey: 'office-directory' });

  assert.equal(getVisualFieldValue(target, 'items.0.offices.0.address'), '常熟总部：儒浜路78号');
  assert.equal(setVisualFieldValue(target, 'items.0.offices.0.address', '常熟总部：新地址'), true);
  assert.deepEqual(record.sections[0].items[0].offices[0], {
    address: '常熟总部：新地址', manager: '吴龙经理', phone: '18050194994'
  });
});

test('legacy service offices gain a saveable phone field for canvas editing', () => {
  const section = {
    id: 'office-directory',
    items: [{
      title: '珠三角区',
      offices: [{ address: '东莞长安店：振安东路768号', manager: '孙金诚经理' }]
    }]
  };

  hydrateServiceOfficeFields(section);
  assert.equal(section.items[0].offices[0].phone, '');
  assert.equal(setVisualFieldValue(section, 'items.0.offices.0.phone', '13300000000'), true);
  assert.equal(section.items[0].offices[0].phone, '13300000000');
});

test('legacy service office media selections materialize governed slots without replacing display fallbacks', () => {
  const section = {
    id: 'office-directory',
    items: [{
      title: '外贸商务办事处',
      image: '/assets/service-office-region-1.jpg',
      map: '/assets/service-office-map-1.jpg',
      offices: []
    }],
    media: []
  };

  hydrateServiceOfficeFields(section);

  assert.equal(section.items[0].media_role, 'office-1');
  assert.equal(section.items[0].map_media_role, 'office-map-1');
  assert.equal(applyVisualMediaReplacement(section, 'items.0.image', '318', { mediaSlot: 'office-1' }), true);
  assert.equal(applyVisualMediaReplacement(section, 'items.0.map', '319', { mediaSlot: 'office-map-1' }), true);
  assert.deepEqual(section.media, [
    { role: 'office-1', media_asset_id: '318' },
    { role: 'office-map-1', media_asset_id: '319' }
  ]);
  assert.equal(section.items[0].image, '/assets/service-office-region-1.jpg');
  assert.equal(section.items[0].map, '/assets/service-office-map-1.jpg');
});

test('legacy service support copy gains saveable fields for every visible support canvas binding', () => {
  const section = { id: 'support', content: {} };

  hydrateServiceSupportFields(section);
  const expected = {
    human_support_label: '需要人工协助？',
    online_title: '在线售后服务',
    online_intro: '不需要预先判断应该进入哪个系统。先让 AI 确认设备情况和服务目标，再在需要提交或查询时打开对应页面。',
    assistant_brand: 'RUIJUN AI SERVICE DESK',
    assistant_heading: '先描述问题\n剩下交给 AI',
    assistant_intro: '报修资料、保修核验和维修进度由服务助手逐步引导。维修系统只用于提交申请与查询状态。',
    assistant_cta: '开始服务咨询',
    step_1_title: '说明设备或服务需求',
    step_1_body: '可直接输入机型、故障现象、进度或保修问题。',
    step_2_title: '由 AI 确认办理路径',
    step_2_body: '先得到资料清单与流程说明，避免无效提交。',
    step_3_title: '需要时再进入维修系统',
    step_3_body: '提交工单、核验保修或查询进度均在独立系统完成。',
    faq_title: '常见服务问题',
    faq_intro: '先了解办理流程，再决定是否进入售后系统。涉及具体设备状态时，以售后工程师确认结果为准。',
    faq_1_question: '报修前需要准备哪些资料？',
    faq_1_answer: '设备型号与铭牌照片、机床编号、故障发生时间、故障现象、报警信息、现场照片或视频，以及联系人和联系电话。',
    faq_1_cta: '继续咨询 AI',
    faq_2_question: '在哪里发起维修申请？',
    faq_2_answer: '先由 AI 确认所需资料；需要提交时，服务助手会打开独立售后系统的维修申请页面。',
    faq_2_cta: '继续咨询 AI',
    faq_3_question: '在哪里查看维修进度？',
    faq_3_answer: '服务助手会引导你进入售后系统查看审核、补充资料、维修处理、寄回物流和归档状态。',
    faq_3_cta: '继续咨询 AI',
    faq_4_question: '如何核验保修状态？',
    faq_4_answer: '准备设备型号和机床编号，再由服务助手提供售后系统入口。',
    faq_4_cta: '继续咨询 AI',
    contact_title: '联系瑞钧',
    contact_intro: '售后服务请使用上方 AI 服务台。设备选型和工厂来访可在此咨询，AI 会先整理信息，再引导至合适的后续安排。',
    contact_sales_eyebrow: 'AI SALES CONSULTATION',
    contact_sales_title: '设备选型与方案',
    contact_sales_body: '输入工件尺寸、材料、精度、锥度、批量和自动化需求，AI 先帮你整理选型要点。',
    contact_sales_cta: '咨询 AI 助手',
    contact_visit_eyebrow: 'AI FACTORY VISIT',
    contact_visit_title: '工厂来访安排',
    contact_visit_body: '询问常熟或昆山工厂地址、来访前准备事项和接待安排，再确认合适的参观时间。',
    contact_visit_cta: '询问来访安排'
  };
  assert.deepEqual(section.content, expected);
  assert.equal(setVisualFieldValue(section, 'content.assistant_brand', 'RUIJUN AI SERVICE DESK - 画布验收'), true);
  assert.equal(section.content.assistant_brand, 'RUIJUN AI SERVICE DESK - 画布验收');
  assert.equal(setVisualFieldValue(section, 'content.faq_1_question', '报修资料有哪些？'), true);
  assert.equal(section.content.faq_1_question, '报修资料有哪些？');
});

test('a multi-office region preserves its sibling office when one address is edited', () => {
  const record = {
    id: 'service',
    sections: [{
      id: 'office-directory',
      items: [{ title: '外贸商务', offices: [] }, {
        title: '长三角区',
        offices: [
          { address: '昆山店：城北路1255号', manager: '王晓枫经理' },
          { address: '无锡店：香港街86栋11号', manager: '贺翔蓝经理' }
        ]
      }]
    }]
  };
  const target = resolveVisualFieldTarget(record, { collection: 'pages', sectionKey: 'office-directory' });

  assert.equal(setVisualFieldValue(target, 'items.1.offices.0.address', '昆山店：新地址'), true);
  assert.deepEqual(record.sections[0].items[1].offices, [
    { address: '昆山店：新地址', manager: '王晓枫经理' },
    { address: '无锡店：香港街86栋11号', manager: '贺翔蓝经理' }
  ]);
  assert.equal(record.sections[0].items[0].title, '外贸商务');
});

test('non-page visual fields resolve to the selected collection record', () => {
  const record = { id: 'article-1', title: '新闻标题' };
  assert.equal(resolveVisualFieldTarget(record, { collection: 'articles', sectionKey: 'ignored' }), record);
});

test('article body and transcript keep the governed long-form limit in the visual property panel', () => {
  assert.equal(visualFieldMaxLength({ collection: 'articles', fieldPath: 'body' }), 30000);
  assert.equal(visualFieldMaxLength({ collection: 'articles', fieldPath: 'transcript' }), 30000);
  assert.equal(visualFieldMaxLength({ collection: 'articles', fieldPath: 'title' }), 240);
  assert.equal(visualFieldMaxLength({ collection: 'pages', fieldPath: 'body' }), 4000);
});

test('a canvas re-selection of the same article retains its unsaved visual draft', () => {
  const current = { collection: 'articles', itemId: '10', draft: { id: 10, body: '<p>未保存正文</p>' } };
  assert.equal(shouldKeepVisualDraft(current, { collection: 'articles', itemId: '10' }), true);
  assert.equal(shouldKeepVisualDraft(current, { collection: 'articles', itemId: '11' }), false);
  assert.equal(shouldKeepVisualDraft(current, { collection: 'case_studies', itemId: '10' }), false);
});

test('product model canvas fields update only the selected nested configuration value', () => {
  const record = {
    id: 15,
    model_code: 'fl1180',
    configuration: { intro: { title: '原介绍标题', subtitle: '原副标题' } }
  };
  const target = resolveVisualFieldTarget(record, { collection: 'product_models', sectionKey: 'parameters' });
  assert.equal(target, record);
  assert.equal(getVisualFieldValue(target, 'configuration.intro.title'), '原介绍标题');
  assert.equal(setVisualFieldValue(target, 'configuration.intro.title', '画布修改标题'), true);
  assert.equal(record.configuration.intro.title, '画布修改标题');
  assert.equal(record.configuration.intro.subtitle, '原副标题');
  assert.equal(record.model_code, 'fl1180');
});

test('visual field paths reject prototype keys, excessive depth, and unknown object creation', () => {
  const target = { items: [{ title: '原值' }] };
  assert.equal(setVisualFieldValue(target, 'items.0.__proto__.polluted', true), false);
  assert.equal(setVisualFieldValue(target, 'items.0.title.text_style.font_size.desktop.value', 10), false);
  assert.equal(setVisualFieldValue(target, 'missing.branch.title', 'x'), false);
  assert.equal({}.polluted, undefined);
});

test('visual number fields retain their numeric schema when changed through the text property editor', () => {
  const target = { value: 30, title: '30 YEARS' };

  assert.equal(setVisualFieldValue(target, 'value', '31'), true);
  assert.equal(target.value, 31);
  assert.equal(typeof target.value, 'number');
  assert.equal(setVisualFieldValue(target, 'value', ''), false);
  assert.equal(setVisualFieldValue(target, 'value', 'not-a-number'), false);
  assert.equal(target.value, 31);
});

test('product proof value stays numeric when Directus has deserialized it as a string', () => {
  const target = { id: 'proof-efficiency', value: '50', unit: '%' };

  assert.equal(setVisualFieldValue(target, 'value', '51'), true);
  assert.equal(target.value, 51);
  assert.equal(typeof target.value, 'number');
  assert.equal(setVisualFieldValue(target, 'value', 'abc'), false);
  assert.equal(target.value, 51);
});

test('media replacement preserves scalar, relation, and media-list field shapes', () => {
  const scalar = { cover_asset: 'old' };
  assert.equal(applyVisualMediaReplacement(scalar, 'cover_asset', 'asset-new'), true);
  assert.equal(scalar.cover_asset, 'asset-new');

  const technicalLabel = { configuration: { labels: { technical_image_asset_id: 'old' } } };
  assert.equal(applyVisualMediaReplacement(technicalLabel, 'configuration.labels.technical_image_asset_id', 'asset-new'), true);
  assert.equal(technicalLabel.configuration.labels.technical_image_asset_id, 'asset-new');

  const homeHero = { hero_video_asset_id: '' };
  assert.equal(applyVisualMediaReplacement(homeHero, 'hero_video_asset_id', '49'), true);
  assert.equal(homeHero.hero_video_asset_id, '49');

  const relation = { image: { media_asset_id: 'old', role: 'cover' } };
  assert.equal(applyVisualMediaReplacement(relation, 'image', 'asset-new'), true);
  assert.deepEqual(relation.image, { media_asset_id: 'asset-new', role: 'cover' });

  const list = { media: [{ media_asset_id: 'old', role: 'hero' }] };
  assert.equal(applyVisualMediaReplacement(list, 'media.0', 'asset-new'), true);
  assert.deepEqual(list.media[0], { media_asset_id: 'asset-new', role: 'hero' });

  const gallery = { assets: ['old-image'] };
  assert.equal(applyVisualMediaReplacement(gallery, 'assets.0', 'asset-new'), true);
  assert.equal(gallery.assets[0], 'asset-new');

  const footerIcon = { footer: { address_icon_asset: '' } };
  assert.equal(applyVisualMediaReplacement(footerIcon, 'footer.address_icon_asset', 'footer-icon'), true);
  assert.equal(footerIcon.footer.address_icon_asset, 'footer-icon');
});

test('service office item media replacement persists to the matching governed role slot', () => {
  const target = {
    items: [{ image: '', map: '', media_role: 'office-1', map_media_role: 'office-map-1' }],
    media: [
      { role: 'office-1', media_asset_id: '317' },
      { role: 'office-map-1', media_asset_id: '316' },
      { role: 'office-2', media_asset_id: '319' }
    ]
  };
  assert.equal(applyVisualMediaReplacement(target, 'items.0.image', '318', { mediaSlot: 'office-1' }), true);
  assert.equal(applyVisualMediaReplacement(target, 'items.0.map', '320', { mediaSlot: 'office-map-1' }), true);
  assert.equal(target.media[0].media_asset_id, '318');
  assert.equal(target.media[1].media_asset_id, '320');
  assert.equal(target.media[2].media_asset_id, '319');
  assert.equal(target.items[0].image, '');
  assert.equal(target.items[0].map, '');
});

test('media replacement rejects text fields and absent paths', () => {
  assert.equal(applyVisualMediaReplacement({ title: '文字' }, 'title', 'asset-new'), false);
  assert.equal(applyVisualMediaReplacement({ media: [] }, 'media.2', 'asset-new'), false);
});

test('declared manufacturing media slots create an exact governed entry without altering existing entries', () => {
  const section = { media: [{ role: 'existing-gallery', media_asset_id: 'old' }] };

  assert.equal(applyVisualMediaReplacement(section, 'media.1', 'asset-new', { mediaSlot: 'cnc-main' }), true);
  assert.deepEqual(section.media, [
    { role: 'existing-gallery', media_asset_id: 'old' },
    { role: 'cnc-main', media_asset_id: 'asset-new' }
  ]);
  assert.equal(applyVisualMediaReplacement(section, 'media.2', 'asset-newer', { mediaSlot: '' }), false);
});

test('canvas list sorting moves only the selected bound card and retargets its field path', () => {
  const section = {
    items: [
      { title: '第一项', sort_order: 0 },
      { title: '第二项', sort_order: 1 },
      { title: '第三项', sort_order: 2 }
    ]
  };

  assert.deepEqual(getVisualListReorder(section, 'items.1.title'), { arrayPath: 'items', index: 1, length: 3 });
  assert.deepEqual(moveVisualListItem(section, 'items.1.title', -1), {
    arrayPath: 'items', index: 0, length: 3, fieldPath: 'items.0.title'
  });
  assert.deepEqual(section.items.map((item) => item.title), ['第二项', '第一项', '第三项']);
  assert.deepEqual(section.items.map((item) => item.sort_order), [0, 1, 2]);
  assert.equal(moveVisualListItem(section, 'items.0.title', -1), null);
  assert.equal(moveVisualListItem(section, 'items.1.offices.0.address', 1), null);

  const product = { configuration: { features: [{ label: 'A' }, { label: 'B' }] } };
  assert.deepEqual(moveVisualListItem(product, 'configuration.features.0.label', 1), {
    arrayPath: 'configuration.features', index: 1, length: 2, fieldPath: 'configuration.features.1.label'
  });
  assert.deepEqual(product.configuration.features.map((item) => item.label), ['B', 'A']);
});

test('canvas list controls duplicate or remove only the selected bound card', () => {
  const section = {
    items: [
      { title: '第一项', description: '说明一', sort_order: 0 },
      { title: '第二项', description: '说明二', sort_order: 1 }
    ]
  };

  assert.deepEqual(duplicateVisualListItem(section, 'items.0.title'), {
    arrayPath: 'items', index: 1, length: 3, fieldPath: 'items.1.title'
  });
  assert.deepEqual(section.items.map((item) => item.title), ['第一项', '第一项', '第二项']);
  assert.deepEqual(section.items.map((item) => item.sort_order), [0, 1, 2]);
  assert.notEqual(section.items[0], section.items[1]);

  assert.deepEqual(removeVisualListItem(section, 'items.1.description'), {
    arrayPath: 'items', index: 1, length: 2, fieldPath: 'items.1.description'
  });
  assert.deepEqual(section.items.map((item) => item.title), ['第一项', '第二项']);
  assert.equal(removeVisualListItem({ items: [{ title: '唯一项' }] }, 'items.0.title'), null);
  assert.equal(duplicateVisualListItem({ items: [{ offices: [{ address: '嵌套门店' }] }] }, 'items.0.offices.0.address'), null);
});

test('duplicated service cards get independent number and media roles', () => {
  const section = {
    items: [
      { number: '01', title: '服务一', media_role: 'action-1' },
      { number: '02', title: '服务二', media_role: 'action-2' }
    ]
  };

  duplicateVisualListItem(section, 'items.0.title');

  assert.deepEqual(section.items.map((item) => item.number), ['01', '03', '02']);
  assert.deepEqual(section.items.map((item) => item.media_role), ['action-1', 'action-3', 'action-2']);
});

test('service action icon slots can return to the original Nuxt icon without clearing ordinary media', () => {
  const section = { media: [{ role: 'action-1', media_asset_id: '77' }] };

  assert.equal(applyVisualMediaReplacement(section, 'media.0', '', { mediaSlot: 'action-1' }), true);
  assert.deepEqual(section.media[0], { role: 'action-1', media_asset_id: '' });
  assert.equal(applyVisualMediaReplacement({ cover_asset: '77' }, 'cover_asset', ''), false);
});

test('an authorized governed page background can be restored to an absent default slot', () => {
  const section = { media: [{ role: 'background', media_asset_id: '86' }] };

  assert.equal(applyVisualMediaReplacement(section, 'media.0', '', { mediaSlot: 'background', allowEmpty: true }), true);
  assert.deepEqual(section.media, []);
});

test('an explicitly authorized scalar media field can return to its website fallback', () => {
  const series = { cover_asset: '40' };

  assert.equal(applyVisualMediaReplacement(series, 'cover_asset', '', { allowEmpty: true }), true);
  assert.equal(series.cover_asset, '');
  assert.equal(applyVisualMediaReplacement({ title: '不可清空' }, 'title', '', { allowEmpty: true }), false);
});

test('site footer media slots can return to their original Nuxt assets without opening arbitrary scalar clearing', () => {
  const footer = { footer: { address_icon_asset: '77' }, brand: { footer_logo_asset: '78' } };

  assert.equal(applyVisualMediaReplacement(footer, 'footer.address_icon_asset', ''), true);
  assert.equal(applyVisualMediaReplacement(footer, 'brand.footer_logo_asset', ''), true);
  assert.equal(footer.footer.address_icon_asset, '');
  assert.equal(footer.brand.footer_logo_asset, '');
  assert.equal(applyVisualMediaReplacement({ title: '不可清空' }, 'title', ''), false);
});

test('home reason drafts gain missing visual fields without replacing stored values', () => {
  const advancedManufacturing = { id: 'advanced-manufacturing', title: '30年技术沉淀，先进制造工厂', body: '' };
  hydrateHomeReasonFields(advancedManufacturing);
  assert.deepEqual(advancedManufacturing, {
    id: 'advanced-manufacturing',
    title: '30年技术沉淀，先进制造工厂',
    body: '',
    kicker: '先进智造',
    shortTitle: '先进智造',
    introTitle: '先进智造',
    introDetail: '30年技术沉淀，先进制造工厂',
    mode: 'photo'
  });

  const preserved = { id: 'industry-leadership', shortTitle: '', introTitle: '自定义标题', mode: 'machine' };
  hydrateHomeReasonFields(preserved);
  assert.equal(preserved.shortTitle, '');
  assert.equal(preserved.introTitle, '自定义标题');
  assert.equal(preserved.mode, 'machine');
});

test('product proof drafts materialize the visible Nuxt fallback fields without replacing stored values', () => {
  const efficiency = { id: 'proof-efficiency', title: '增效降损', body: '效能提升50%，丝损降低30%', requires_claim_review: true };
  hydrateProductProofFields(efficiency);
  assert.deepEqual(efficiency, {
    id: 'proof-efficiency',
    title: '增效降损',
    body: '效能提升50%，丝损降低30%',
    requires_claim_review: true,
    value: 50,
    unit: '%'
  });

  const years = { id: 'proof-years' };
  hydrateProductProofFields(years);
  assert.deepEqual(years, {
    id: 'proof-years',
    title: '30 YEARS',
    body: '30年技术沉淀，先进智造工厂',
    value: 30,
    unit: 'YEARS'
  });

  const preserved = { id: 'proof-champion', title: '', body: '自定义说明' };
  hydrateProductProofFields(preserved);
  assert.equal(preserved.title, '');
  assert.equal(preserved.body, '自定义说明');
  assert.equal(Object.hasOwn(preserved, 'value'), false);

  const legacyEmpty = { id: 'proof-efficiency', value: '', unit: '' };
  hydrateProductProofFields(legacyEmpty);
  assert.deepEqual(legacyEmpty, { id: 'proof-efficiency', value: 50, unit: '%', title: '50%', body: '产品效率性能提升' });
});
