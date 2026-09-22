import assert from 'node:assert/strict';
import test from 'node:test';

import { previewCollectionFields, previewContentRecord } from '../content-preview/content-preview-content.mjs';

test('draft preview keeps public-facing fields and removes private evidence', () => {
  const preview = previewContentRecord('pages', {
    id: 'page-1', title: '页面标题', slug: 'about', status: 'draft', publication_state: 'unpublished',
    sections: [{ id: 'intro', title: '段落', body: '正文', requires_claim_review: true, source_url: 'https://private.example' }],
    source_document: 'internal.docx', source_url: 'https://private.example', contacts: { phone: '15000000000' }
  });
  assert.deepEqual(preview, {
    id: 'page-1', title: '页面标题', slug: 'about', status: 'draft', publication_state: 'unpublished',
    sections: [{ id: 'intro', title: '段落', body: '正文', requires_claim_review: true }]
  });
  assert.ok(!previewCollectionFields('pages').includes('source_document'));
});

test('homepage hero draft preview retains its selected video asset without exposing private section fields', () => {
  const preview = previewContentRecord('pages', {
    id: 1,
    slug: 'home',
    sections: [
      { id: 'hero', hero_video_asset_id: '49', hero_video_asset_url: '/api/preview/media/49', internal_note: 'private' },
      { id: 'intro', hero_video_asset_id: '50', internal_note: 'private' }
    ]
  });

  assert.deepEqual(preview.sections, [
    { id: 'hero', hero_video_asset_id: '49', hero_video_asset_url: '/api/preview/media/49' },
    { id: 'intro' }
  ]);
});

test('manufacturing layer preview retains its governed media reference across a new preview session', () => {
  const preview = previewContentRecord('pages', {
    id: 8,
    slug: 'manufacturing',
    sections: [{
      id: 'precision-machining',
      media: [{ role: 'cnc-main', media_asset_id: 'cnc-layer-asset', private_note: 'do-not-expose' }]
    }]
  });

  assert.deepEqual(preview.sections, [{
    id: 'precision-machining',
    media: [{ role: 'cnc-main', media_asset_id: 'cnc-layer-asset' }]
  }]);
});

test('service location draft preview excludes contact details', () => {
  const preview = previewContentRecord('service_locations', {
    id: 'location-1', region: '华东', city: '杭州', service_scope: '维修', contact: { phone: '15000000000' }, status: 'draft', publication_state: 'unpublished'
  });
  assert.equal(preview.city, '杭州');
  assert.equal('contact' in preview, false);
});

test('milestone draft preview keeps controlled timeline media references', () => {
  const preview = previewContentRecord('milestones', {
    id: 'milestone-1', source_key: 'm-1', year: 2024, event: '事件', evidence: '证据',
    media: [{ media_asset_id: 'timeline-bg' }], icon_asset: 'timeline-icon',
    source_url: 'https://private.example', status: 'draft', publication_state: 'unpublished'
  });
  assert.deepEqual(preview.media, [{ media_asset_id: 'timeline-bg' }]);
  assert.equal(preview.icon_asset, 'timeline-icon');
  assert.ok(!Object.hasOwn(preview, 'source_url'));
});

test('global settings draft preview keeps approved contacts without private fields', () => {
  const preview = previewContentRecord('site_settings', {
    id: 'site-1', setting_key: 'global', contacts: { domestic_phone: '13738375470' }, private_note: 'internal'
  });
  assert.deepEqual(preview, { id: 'site-1', setting_key: 'global', contacts: { domestic_phone: '13738375470' } });
});

test('repair page draft preview keeps website fields and removes source evidence', () => {
  const preview = previewContentRecord('repair_page_configs', {
    id: 'repair-1', page_key: 'repair_home', title: '售后服务', intro: '服务说明',
    action_cards: [{ title: '视频教学' }], status: 'draft', publication_state: 'unpublished', source_document: 'internal.psd'
  });
  assert.equal(preview.title, '售后服务');
  assert.deepEqual(preview.action_cards, [{ title: '视频教学' }]);
  assert.equal('source_document' in preview, false);
});

test('draft preview parses governed JSON fields returned as SQLite strings', () => {
  const preview = previewContentRecord('pages', {
    id: 'page-2', title: '页面标题', status: 'draft', publication_state: 'unpublished',
    sections: JSON.stringify([{ id: 'intro', title: '可预览段落', body: '段落正文', source_url: 'private' }]),
    seo: JSON.stringify({ title: '搜索标题' })
  });
  assert.deepEqual(preview.sections, [{ id: 'intro', title: '可预览段落', body: '段落正文' }]);
  assert.deepEqual(preview.seo, { title: '搜索标题' });
});

test('article draft preview preserves Directus Date display_date values', () => {
  const preview = previewContentRecord('articles', {
    id: 10,
    slug: 'date-regression',
    title: '日期回归测试',
    display_date: new Date('2026-08-24T00:00:00.000Z'),
    status: 'draft',
    publication_state: 'unpublished'
  });
  assert.equal(preview.display_date, '2026-08-24T00:00:00.000Z');
});

test('article draft preview carries only supported card field presentations on initial canvas load', () => {
  const preview = previewContentRecord('articles', {
    id: 10,
    slug: 'card-presentation',
    category: 'news',
    title: '列表卡片样式',
    field_presentation: {
      title: { text_style: { enabled: true, size_desktop: 26, css: 'position:fixed' } },
      display_date: { layout: { enabled: true, desktop: { offset_x: 2 } } },
      private_note: { text_style: { enabled: true, size_desktop: 120 } }
    }
  });

  assert.equal(preview.field_presentation.title.text_style.size_desktop, 26);
  assert.equal(Object.hasOwn(preview.field_presentation.title.text_style, 'css'), false);
  assert.equal(preview.field_presentation.display_date.layout.desktop.offset_x, 2);
  assert.equal(Object.hasOwn(preview.field_presentation, 'private_note'), false);
});

test('page draft preview retains controlled pagination and repeated item presentation', () => {
  const result = previewContentRecord('pages', { id: 7, sections: [{ id: 'pagination', pagination: { page_size: 6, sort: 'manual' }, items: [{ title: '节点', layout: { enabled: true, align_x: 'center' } }] }] });
  assert.deepEqual(result.sections[0].pagination, { page_size: 6, sort: 'manual' });
  assert.equal(result.sections[0].items[0].layout.enabled, true);
});

test('page draft preview preserves the complete controlled presentation of repeated items', () => {
  const result = previewContentRecord('pages', {
    id: 3,
    sections: [{
      id: 'support-actions',
      items: [{
        title: '入口一',
        layout: {
          enabled: false,
          template: 'default',
          align_x: 'left',
          align_y: 'top',
          width: 'normal',
          gap: 'medium',
          order: 0,
          z_index: 0,
          desktop: { offset_x: 0, offset_y: 0 },
          mobile: { offset_x: 0, offset_y: 0 }
        },
        text_style: {
          enabled: false,
          preset: 'inherit',
          weight: 400,
          size_desktop: 0,
          size_mobile: 0,
          line_height: 1.4,
          color: '',
          max_width: 'normal'
        },
        responsive: {
          enabled: false,
          desktop_visible: true,
          tablet_visible: true,
          mobile_visible: true,
          mobile_template: 'inherit'
        },
        media_presentation: {
          enabled: false,
          fit: 'cover',
          focal_x: 50,
          focal_y: 50,
          overlay: 'none',
          poster_asset_id: ''
        }
      }]
    }]
  });
  const item = result.sections[0].items[0];
  assert.deepEqual(item.layout, {
    enabled: false,
    template: 'default',
    align_x: 'left',
    align_y: 'top',
    width: 'normal',
    gap: 'medium',
    order: 0,
    z_index: 0,
    desktop: { offset_x: 0, offset_y: 0 },
    mobile: { offset_x: 0, offset_y: 0 }
  });
  assert.equal(item.text_style.size_desktop, 0);
  assert.equal(item.text_style.max_width, 'normal');
  assert.equal(item.responsive.desktop_visible, true);
  assert.equal(item.media_presentation.fit, 'cover');
});

test('manufacturing process draft preview retains item field presentation for canvas editing', () => {
  const result = previewContentRecord('pages', {
    id: 8,
    sections: [{
      id: 'process',
      items: [{
        title: '工艺节点',
        body: '节点说明',
        connection_label: '连接说明',
        field_presentation: {
          title: { layout: { enabled: true, desktop: { offset_x: 3 } }, text_style: { enabled: true, size_desktop: 32, color: '#123456' } },
          body: { text_style: { enabled: true, size_desktop: 18 } },
          private_note: { text_style: { enabled: true, size_desktop: 120 } }
        }
      }]
    }]
  });
  const item = result.sections[0].items[0];
  assert.equal(item.field_presentation.title.layout.desktop.offset_x, 3);
  assert.equal(item.field_presentation.title.text_style.size_desktop, 32);
  assert.equal(item.field_presentation.body.text_style.size_desktop, 18);
  assert.equal(Object.hasOwn(item.field_presentation, 'private_note'), false);
});

test('service support desk preview retains every visible online-service copy field', () => {
  const result = previewContentRecord('pages', {
    id: 3,
    sections: [{
      id: 'support',
      content: {
        assistant_brand: '品牌', assistant_heading: '主标题', assistant_intro: '说明', assistant_cta: '开始',
        step_1_title: '步骤一', step_1_body: '步骤一说明', step_2_title: '步骤二', step_2_body: '步骤二说明',
        step_3_title: '步骤三', step_3_body: '步骤三说明', private_note: '不要暴露'
      }
    }]
  });
  assert.deepEqual(result.sections[0].content, {
    assistant_brand: '品牌', assistant_heading: '主标题', assistant_intro: '说明', assistant_cta: '开始',
    step_1_title: '步骤一', step_1_body: '步骤一说明', step_2_title: '步骤二', step_2_body: '步骤二说明',
    step_3_title: '步骤三', step_3_body: '步骤三说明'
  });
});

test('page draft preview retains normalized field presentation for independently positioned scalar copy', () => {
  const result = previewContentRecord('pages', {
    id: 1,
    sections: [{
      id: 'product-task',
      title: '选型咨询',
      field_presentation: {
        title: { layout: { enabled: true, desktop: { offset_x: 6, offset_y: -2 } }, text_style: { enabled: true, size_desktop: 42, css: 'position:fixed' } },
        private_note: { layout: { enabled: true } }
      }
    }]
  });
  assert.equal(result.sections[0].field_presentation.title.layout.desktop.offset_x, 6);
  assert.equal(result.sections[0].field_presentation.title.text_style.size_desktop, 42);
  assert.equal(Object.hasOwn(result.sections[0].field_presentation.title.text_style, 'css'), false);
  assert.equal(Object.hasOwn(result.sections[0].field_presentation, 'private_note'), false);
});

test('product parameter draft preview retains only presentations for rendered parameter cells', () => {
  const result = previewContentRecord('product_parameters', {
    id: 94,
    model_code: 'fl1390',
    field_name: 'XY 行程',
    value: '1300*900',
    presentation: {
      field_presentation: {
        field_name: { text_style: { enabled: true, size_desktop: 20, color: '#123456', css: 'position:fixed' } },
        internal_note: { text_style: { enabled: true, size_desktop: 120 } }
      }
    }
  });

  assert.equal(result.presentation.field_presentation.field_name.text_style.size_desktop, 20);
  assert.equal(Object.hasOwn(result.presentation.field_presentation.field_name.text_style, 'css'), false);
  assert.equal(Object.hasOwn(result.presentation.field_presentation, 'internal_note'), false);
});

test('product series draft preview retains only card name and positioning presentation', () => {
  const result = previewContentRecord('product_series', {
    id: 8,
    name: 'FR-XS',
    positioning: '精密切割',
    presentation: {
      field_presentation: {
        name: { text_style: { enabled: true, size_desktop: 34, css: 'position:fixed' } },
        internal_note: { text_style: { enabled: true, size_desktop: 120 } }
      }
    }
  });
  assert.equal(result.presentation.field_presentation.name.text_style.size_desktop, 34);
  assert.equal(Object.hasOwn(result.presentation.field_presentation.name.text_style, 'css'), false);
  assert.equal(Object.hasOwn(result.presentation.field_presentation, 'internal_note'), false);
});

test('product model draft preview retains only the model-code presentation', () => {
  const result = previewContentRecord('product_models', {
    id: 17,
    model_code: 'FL1610XS(pro)',
    presentation: {
      field_presentation: {
        model_code: { text_style: { enabled: true, size_desktop: 24, color: '#123456', css: 'position:fixed' } },
        internal_note: { text_style: { enabled: true, size_desktop: 120 } }
      }
    }
  });
  assert.equal(result.presentation.field_presentation.model_code.text_style.size_desktop, 24);
  assert.equal(Object.hasOwn(result.presentation.field_presentation.model_code.text_style, 'css'), false);
  assert.equal(Object.hasOwn(result.presentation.field_presentation, 'internal_note'), false);
});
