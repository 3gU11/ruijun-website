import assert from 'node:assert/strict';
import test from 'node:test';
import { homepageFieldPresentationPath, homepageReasonBinding, homepageSectionItemBinding, manufacturingTextBinding, managedPageSectionMediaBinding, pageSectionMediaBinding, qualificationAssetBinding, selectSectionMediaEntry, serviceLocationRecordBinding, serviceOfficeBinding, serviceSectionMediaBinding } from '../shared/visual-binding-paths.mjs';

test('homepage page-section reasons use fields relative to the selected page section', () => {
  assert.deepEqual(homepageReasonBinding({
    id: 'performance',
    cms_collection: 'pages',
    cms_item_id: 1,
    cms_section_key: 'performance',
    title: '增效降损',
    body: '效能提升50%，丝损降低30%',
    media: []
  }), {
    collection: 'pages',
    itemId: '1',
    sectionKey: 'performance',
    fields: {
      title: 'title',
      body: 'body',
      shortTitle: null,
      introTitle: null,
      introDetail: 'body',
      image: null,
      icon: null
    }
  });
});

test('dedicated homepage reason records keep content text paths and governed media indexes', () => {
  assert.deepEqual(homepageReasonBinding({
    id: 'performance',
    cms_collection: 'homepage_sections',
    cms_item_id: 701,
    cms_section_key: 'performance',
    content: {
      title: '增效降损',
      body: '效能提升50%，丝损降低30%',
      shortTitle: '增效降损',
      introTitle: '增效降损',
      introDetail: '效能提升50%，丝损降低30%'
    },
    media: [
      { role: 'background', path: '/assets/reason.jpg', managed: true },
      { role: 'tab-icon', path: '/assets/reason-icon.png', managed: true }
    ]
  }), {
    collection: 'homepage_sections',
    itemId: '701',
    sectionKey: 'performance',
    fields: {
      title: 'content.title',
      body: 'content.body',
      shortTitle: 'content.shortTitle',
      introTitle: 'content.introTitle',
      introDetail: 'content.introDetail',
      image: 'media.0',
      icon: 'media.1'
    }
  });
  const staticReason = {
    id: 'performance', cms_collection: 'pages', cms_item_id: 1, cms_section_key: 'performance',
    title: '静态理由', media: [{ role: 'background', path: '/assets/psd/reason.jpg' }, { role: 'tab-icon', path: '/assets/psd/icon.png' }]
  };
  assert.equal(homepageReasonBinding(staticReason).fields.image, null);
  assert.equal(homepageReasonBinding(staticReason).fields.icon, null);
  assert.equal(homepageReasonBinding({ id: 'performance', cms_collection: 'pages', body: 'fallback only' }), null);
});

test('homepage repeated items use their collection-specific container and governed media role', () => {
  const section = {
    id: 'marquee', cms_collection: 'pages', cms_item_id: 1, cms_section_key: 'marquee',
    items: [{ title: '一', body: '说明一' }, { title: '二', body: '说明二', shortTitle: '短标题', media_role: 'card-2' }],
    media: [{ role: 'card-2', path: '/assets/card-2.jpg', managed: true }]
  };
  assert.deepEqual(homepageSectionItemBinding(section, section, 1), {
    collection: 'pages', itemId: '1', sectionKey: 'marquee',
    fields: {
      title: 'items.1.title', body: 'items.1.body', shortTitle: 'items.1.shortTitle',
      introTitle: 'items.1.title', introDetail: 'items.1.body', image: 'media.0', icon: null
    }
  });
  const dedicated = {
    id: 'marquee', cms_collection: 'homepage_sections', cms_item_id: 702, cms_section_key: 'marquee',
    content: { items: [{ title: '独立条目', body: '独立说明' }] }, media: []
  };
  assert.equal(homepageSectionItemBinding(dedicated, dedicated, 0).fields.body, 'content.items.0.body');
  assert.equal(homepageSectionItemBinding(section, section, 4), null);
});

test('homepage presentation paths stay beside the exact rendered text field', () => {
  const pageReason = homepageReasonBinding({
    id: 'performance', cms_collection: 'pages', cms_item_id: 1, cms_section_key: 'performance',
    title: '增效降损', introTitle: '效率', introDetail: '说明', body: '说明'
  });
  assert.equal(homepageFieldPresentationPath(pageReason, 'introTitle'), 'field_presentation.introTitle');
  assert.equal(homepageFieldPresentationPath(pageReason, 'body'), 'field_presentation.body');

  const dedicatedItem = homepageSectionItemBinding({
    id: 'marquee', cms_collection: 'homepage_sections', cms_item_id: 702, cms_section_key: 'marquee',
    content: { items: [{ title: '独立条目', shortTitle: '短标题', body: '独立说明' }] }
  }, {
    content: { items: [{ title: '独立条目', shortTitle: '短标题', body: '独立说明' }] }
  }, 0);
  assert.equal(homepageFieldPresentationPath(dedicatedItem, 'shortTitle'), 'content.items.0.field_presentation.shortTitle');
  assert.equal(homepageFieldPresentationPath(dedicatedItem, 'title'), 'content.items.0.field_presentation.title');
  assert.equal(homepageFieldPresentationPath(dedicatedItem, 'missing'), null);
});

test('service office bindings are emitted only for configured page items', () => {
  assert.deepEqual(serviceOfficeBinding(2, 1), {
    regionTitle: 'items.2.title',
    regionImage: 'items.2.image',
    address: 'items.2.offices.1.address',
    manager: 'items.2.offices.1.manager',
    phone: 'items.2.offices.1.phone'
  });
  assert.equal(serviceOfficeBinding(undefined, 0), null);
  assert.equal(serviceOfficeBinding(0, undefined), null);
});

test('Directus service locations retain collection, real id, and exact contact paths', () => {
  assert.deepEqual(serviceLocationRecordBinding({ id: 12, source_key: 'office-suzhou', contact: {} }), {
    collection: 'service_locations', itemId: '12', sourceKey: 'office-suzhou',
    regionTitle: 'region', address: 'service_scope', manager: 'contact.name', phone: 'contact.phone'
  });
  assert.equal(serviceLocationRecordBinding({ id: 13, source_key: 'office-wuxi', contact: { address: '无锡地址' } }).address, 'contact.address');
  assert.equal(serviceLocationRecordBinding({ source_key: 'missing-id' }), null);
});

test('qualification bindings retain each record asset index after gallery flattening', () => {
  assert.deepEqual(qualificationAssetBinding({ id: 'qualification-1' }, 3), {
    collection: 'qualifications', itemId: 'qualification-1', fieldPath: 'assets.3'
  });
  assert.equal(qualificationAssetBinding({ source_key: 'legacy-only' }, 0), null);
});

test('page section media bindings use the original section media index', () => {
  assert.deepEqual(pageSectionMediaBinding(4), { fieldPath: 'media.4', positionFieldPath: 'media.4' });
  assert.equal(pageSectionMediaBinding(-1), null);
  assert.equal(pageSectionMediaBinding(undefined), null);
});

test('service section media bindings reject static fallback paths and accept governed media assets', () => {
  assert.equal(serviceSectionMediaBinding({ path: '/assets/service-office-region-1.jpg' }, 0), null);
  assert.equal(serviceSectionMediaBinding({ path: '/assets/service-office-region-1.jpg', managed: false }, 0), null);
  assert.deepEqual(serviceSectionMediaBinding({ path: '/assets/cms-office.jpg', managed: true }, 2), {
    fieldPath: 'media.2', positionFieldPath: 'media.2'
  });
  assert.deepEqual(serviceSectionMediaBinding({ path: '/assets/cms-office.jpg', media_asset_id: 42 }, 1), {
    fieldPath: 'media.1', positionFieldPath: 'media.1'
  });
  assert.deepEqual(serviceSectionMediaBinding({ path: '/assets/cms-office.jpg', file_id: 'abc' }, 3), {
    fieldPath: 'media.3', positionFieldPath: 'media.3'
  });
});

test('section media selection prefers a resolved replacement over an earlier default slot with the same role', () => {
  const media = [
    { role: 'action-1' },
    { role: 'action-2' },
    { role: 'action-1', media_asset_id: 76, managed: true, path: '/api/preview/media/76' }
  ];

  assert.deepEqual(selectSectionMediaEntry(media, 'action-1'), {
    index: 2,
    entry: media[2]
  });
  assert.deepEqual(selectSectionMediaEntry(media, 'action-2'), {
    index: 1,
    entry: media[1]
  });
});

test('managed page-section media bindings reject placement fallback paths', () => {
  assert.equal(managedPageSectionMediaBinding({ path: '/assets/news-hero.jpg' }, 0), null);
  assert.deepEqual(managedPageSectionMediaBinding({ path: '/assets/cms-news.mp4', managed: true }, 1), {
    fieldPath: 'media.1', positionFieldPath: 'media.1'
  });
});

test('manufacturing PSD text bindings use explicit section and field paths', () => {
  assert.deepEqual(manufacturingTextBinding('hero-process'), { sectionKey: 'hero', fieldPath: 'processTitle' });
  assert.deepEqual(manufacturingTextBinding('hero-output'), { sectionKey: 'hero', fieldPath: 'outputText' });
  assert.deepEqual(manufacturingTextBinding('cnc-title'), { sectionKey: 'precision-machining', fieldPath: 'title' });
  assert.deepEqual(manufacturingTextBinding('cnc-description'), { sectionKey: 'precision-machining', fieldPath: 'description' });
  assert.deepEqual(manufacturingTextBinding('cnc-detail'), { sectionKey: 'precision-machining', fieldPath: 'detail' });
  assert.deepEqual(manufacturingTextBinding('hero-output'), { sectionKey: 'hero', fieldPath: 'outputText' });
  assert.equal(manufacturingTextBinding('unknown-psd-copy'), null);
});
