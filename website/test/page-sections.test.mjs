import assert from 'node:assert/strict';
import test from 'node:test';

const { resolvePageSection } = await import('../shared/page-sections.mjs');
test('independent background does not replace foreground machine', () => {
  const result = resolvePageSection({ sections: [{ id: 'performance', media: [{ role: 'background', path: '/bg.jpg' }, { role: 'foreground', path: '/machine.png' }] }] }, 'performance', { image: '/machine.png', background: '' });
  assert.equal(result.background, '/bg.jpg');
  assert.equal(result.image, '/machine.png');
});
test('an icon-only replacement never becomes the scene background', () => {
  const fallback = { image: '/factory.jpg', icon: '/icon.png' };
  const page = { sections: [{ id: 'advanced-manufacturing', media: [{ role: 'icon', mediaType: 'image', path: '/new-icon.png' }] }] };
  const result = resolvePageSection(page, 'advanced-manufacturing', fallback);
  assert.equal(result.image, '/factory.jpg');
  assert.equal(result.icon, '/new-icon.png');
});

test('page section resolver overlays only valid published CMS copy onto visual fallbacks', () => {
  const fallback = { kicker: 'WHY RUIJUN', title: '默认标题', body: '默认说明' };
  const page = { sections: [{ id: 'why-ruijun', kicker: 'WHY', title: '已审核标题', body: '已审核说明' }] };

  assert.deepEqual(resolvePageSection(page, 'why-ruijun', fallback), { kicker: 'WHY', title: '已审核标题', body: '已审核说明' });
  assert.deepEqual(resolvePageSection({ sections: [{ id: 'why-ruijun', title: '  ' }] }, 'why-ruijun', fallback), fallback);
});

test('page section resolver never renders a section still marked for claim review', () => {
  const fallback = { title: '默认标题', body: '默认说明' };
  const page = { sections: [{ id: 'industry-leadership', title: '未经审核的排名主张', requires_claim_review: true }] };

  assert.deepEqual(resolvePageSection(page, 'industry-leadership', fallback), fallback);
});

test('page section resolver exposes a claim-review draft only to an authenticated editor preview', () => {
  const fallback = { title: '默认标题', body: '默认说明', value: 0, unit: '' };
  const page = { id: 7, sections: [{ id: 'proof-efficiency', title: '50%', body: '产品效率性能提升', value: 50, unit: '%', requires_claim_review: true }] };

  assert.deepEqual(resolvePageSection(page, 'proof-efficiency', fallback, { allowClaimReview: true }), {
    ...fallback,
    title: '50%',
    body: '产品效率性能提升',
    value: 50,
    unit: '%',
    cms_collection: 'pages',
    cms_item_id: '7',
    cms_section_key: 'proof-efficiency'
  });
});

test('page section resolver overlays normalized presentation fields onto visual fallbacks', () => {
  const fallback = { title: '默认标题', layout: { template: 'default' } };
  const page = { sections: [{ id: 'hero', title: '新标题', layout: { template: 'overlay-center', desktop: { offset_x: 8 } }, text_style: { size_desktop: 60, color: '#123456' } }] };
  const result = resolvePageSection(page, 'hero', fallback);
  assert.equal(result.title, '新标题');
  assert.equal(result.layout.template, 'overlay-center');
  assert.equal(result.layout.desktop.offset_x, 8);
  assert.equal(result.text_style.size_desktop, 60);
});

test('page section resolver preserves the controlled homepage hero preview video URL', () => {
  const result = resolvePageSection({ sections: [{
    id: 'hero',
    hero_video_asset_id: '49',
    hero_video_asset_url: 'http://127.0.0.1:8055/assets/fd91ae8c-28e2-4270-a3fe-7b21e0669a10'
  }] }, 'hero', { title: '默认标题' });

  assert.equal(result.hero_video_asset_id, '49');
  assert.equal(result.hero_video_asset_url, 'http://127.0.0.1:8055/assets/fd91ae8c-28e2-4270-a3fe-7b21e0669a10');
});

test('page section resolver flattens controlled homepage content and maps media roles', () => {
  const fallback = { title: '默认标题', shortTitle: '默认短标题', introTitle: '默认摘要', introDetail: '默认说明', image: '/fallback.jpg', icon: '/fallback-icon.png', mode: 'photo', media: [] };
  const page = { sections: [{ id: 'performance', content: { title: 'CMS 标题', shortTitle: '短标题', introTitle: '效率', introDetail: '说明', mode: 'machine' }, media: [{ role: 'image', path: '/cms-machine.jpg', mediaType: 'image' }, { role: 'icon', path: '/cms-icon.png', mediaType: 'image' }] }] };
  assert.deepEqual(resolvePageSection(page, 'performance', fallback), { ...fallback, title: 'CMS 标题', shortTitle: '短标题', introTitle: '效率', introDetail: '说明', mode: 'machine', image: '/cms-machine.jpg', icon: '/cms-icon.png', media: page.sections[0].media });
});

test('page section resolver preserves controlled manufacturing detail copy', () => {
  const result = resolvePageSection({ sections: [{ id: 'precision-machining', title: 'CNC', detail: '核心设备说明' }] }, 'precision-machining', { title: '默认', detail: '' });
  assert.equal(result.detail, '核心设备说明');
});

test('page section resolver exposes manufacturing hero visual copy without repurposing its mobile title', () => {
  const result = resolvePageSection({ sections: [{
    id: 'hero', title: '先进制造', body: '全产业链制造与严格质量控制。',
    processTitle: 'World top class production process', outputText: '年产量可达10000台'
  }] }, 'hero', { title: '', body: '', processTitle: '', outputText: '' });
  assert.equal(result.title, '先进制造');
  assert.equal(result.body, '全产业链制造与严格质量控制。');
  assert.equal(result.processTitle, 'World top class production process');
  assert.equal(result.outputText, '年产量可达10000台');
});

test('page section resolver preserves an independent homepage marquee list', () => {
  const page = { sections: [{ id: 'marquee', items: [{ title: '横移标题', body: '横移正文', image: '/marquee.jpg' }] }] };
  const result = resolvePageSection(page, 'marquee', { items: [] });
  assert.deepEqual(result.items, page.sections[0].items);
});

test('page section resolver preserves the real homepage section binding metadata', () => {
  const result = resolvePageSection({ sections: [{ id: 'marquee', cms_collection: 'homepage_sections', cms_item_id: '702', items: [] }] }, 'marquee', { items: [] });
  assert.equal(result.cms_collection, 'homepage_sections');
  assert.equal(result.cms_item_id, '702');
});

test('page section resolver exposes the owning pages record for visual editing', () => {
  const result = resolvePageSection({ id: 42, sections: [{ id: 'hero', title: '关于首屏' }] }, 'hero', { title: '默认标题' });
  assert.equal(result.cms_collection, 'pages');
  assert.equal(result.cms_item_id, '42');
  assert.equal(result.cms_section_key, 'hero');
});

test('page section resolver preserves controlled nested content for service sections', () => {
  const content = { assistant_heading: '服务助手', map_button_title: '选择地图' };
  const result = resolvePageSection({ id: 8, sections: [{ id: 'support', title: '支持', content }] }, 'support', { title: '', content: {} });
  assert.deepEqual(result.content, content);
  assert.equal(result.cms_collection, 'pages');
  assert.equal(result.cms_item_id, '8');
});

test('page section resolver preserves product pagination labels for visual editing', () => {
  const result = resolvePageSection({ id: 7, sections: [{
    id: 'pagination',
    pagination: { page_size: 6, previous_label: '上一批', next_label: '下一批' }
  }] }, 'pagination', {
    title: '技术参数型号翻页',
    pagination: { page_size: 6, previous_label: '上一页', next_label: '下一页' }
  });

  assert.equal(result.pagination.page_size, 6);
  assert.equal(result.pagination.previous_label, '上一批');
  assert.equal(result.pagination.next_label, '下一批');
  assert.equal(result.cms_collection, 'pages');
  assert.equal(result.cms_item_id, '7');
  assert.equal(result.cms_section_key, 'pagination');
});

test('page section resolver binds repeated item media roles to approved section media', () => {
  const result = resolvePageSection({ sections: [{
    id: 'marquee',
    items: [{ id: 'item-1', title: '可编辑卡片', media_role: 'card-1' }, { id: 'item-2', media_role: 'icon-2' }],
    media: [
      { role: 'card-1', path: '/cms/card.webp', mediaType: 'image', alt: '卡片图' },
      { role: 'icon-2', path: '/cms/icon.webp', mediaType: 'image', alt: '图标' }
    ]
  }] }, 'marquee', { items: [] });
  assert.equal(result.items[0].image, '/cms/card.webp');
  assert.equal(result.items[0].alt, '卡片图');
  assert.equal(result.items[1].image, '/cms/icon.webp');
  assert.equal(result.items[1].icon, '/cms/icon.webp');
});
