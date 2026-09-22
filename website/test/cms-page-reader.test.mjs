import assert from 'node:assert/strict';
import test from 'node:test';

const { createCmsPageReader } = await import('../server/services/cms-page-reader.mjs');

const publishedPage = {
  slug: 'home', title: '瑞钧智科', language: 'zh-CN', sections: [],
  status: 'published', publication_state: 'published', published_at: '2026-07-31T00:00:00.000Z'
};

test('Nuxt CMS page reader exposes only the requested published page', async () => {
  let requestedUrl;
  const reader = createCmsPageReader({
    endpoint: 'https://cms.example.test/items/pages', now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return Response.json({ data: [publishedPage, { ...publishedPage, status: 'draft' }, { ...publishedPage, slug: 'about' }] });
    }
  });

  assert.deepEqual(await reader.get('home'), { data: publishedPage, cache: 'fresh', source: 'cms' });
  assert.equal(requestedUrl.searchParams.get('filter[slug][_eq]'), 'home');
  assert.equal(requestedUrl.searchParams.get('filter[status][_eq]'), 'published');
  assert.equal(requestedUrl.searchParams.get('filter[publication_state][_eq]'), 'published');
  assert.match(requestedUrl.searchParams.get('fields') || '', /(^|,)id(,|$)/);
});

test('Nuxt CMS page reader excludes individual sections still marked for claim review', async () => {
  const publicSection = { id: 'why-ruijun', title: '可公开的制造说明', body: '已完成审核。' };
  const reader = createCmsPageReader({
    endpoint: 'https://cms.example.test/items/pages', now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async () => Response.json({ data: [{
      ...publishedPage,
      sections: [publicSection, { id: 'industry-leadership', title: '待核实宣传数字', requires_claim_review: true }]
    }] })
  });

  assert.deepEqual(await reader.get('home'), {
    data: { ...publishedPage, sections: [publicSection] }, cache: 'fresh', source: 'cms'
  });
});

test('Nuxt CMS page reader resolves only published media assets referenced by page sections', async () => {
  const reader = createCmsPageReader({
    endpoint: 'https://cms.example.test/items/pages',
    mediaAssetsEndpoint: 'https://cms.example.test/items/media_assets',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url) => {
      const request = new URL(url);
      if (request.pathname.endsWith('/media_assets')) {
        return Response.json({ data: [
          { id: 7, file_id: 'published-machine', alt_text: '已审核机床图片', status: 'published', publication_state: 'published', published_at: '2026-07-31T00:00:00.000Z' },
          { id: 8, file_id: 'draft-machine', alt_text: '草稿图片', status: 'draft', publication_state: 'unpublished' }
        ] });
      }
      return Response.json({ data: [{
        ...publishedPage,
        sections: [{
          id: 'hero', title: '已审核标题', internal_note: 'never public',
          media: [{ media_asset_id: 7 }, { media_asset_id: 8 }, { path: 'https://unapproved.example.test/image.jpg' }]
        }]
      }] });
    }
  });

  const result = await reader.get('home');
  assert.equal(result.cache, 'fresh');
  assert.equal(result.source, 'cms');
  assert.equal(result.data.sections[0].media.length, 1);
  assert.equal(result.data.sections[0].media[0].path, 'https://cms.example.test/assets/published-machine');
  assert.equal(result.data.sections[0].media[0].alt, '已审核机床图片');
  assert.equal(Object.hasOwn(result.data.sections[0], 'internal_note'), false);
});

test('Nuxt CMS page reader publishes normalized presentation fields without leaking arbitrary CSS', async () => {
  const reader = createCmsPageReader({
    endpoint: 'https://cms.example.test/items/pages',
    fetchImpl: async () => Response.json({ data: [{
      ...publishedPage,
      sections: [{
        id: 'hero', title: '可配置首屏', style: 'position:fixed', css: '.site{display:none}',
        layout: { template: 'overlay-left', align_x: 'center', z_index: 50, desktop: { offset_x: 12, offset_y: -4 } },
        text_style: { preset: 'hero', weight: 700, size_desktop: 64, color: '#ffffff', css: 'font-size:999px' },
        responsive: { mobile_visible: false },
        media_presentation: { fit: 'contain', focal_x: 75, focal_y: 30 }
      }]
    }] })
  });

  const result = await reader.get('home');
  const section = result.data.sections[0];
  assert.equal(section.layout.template, 'overlay-left');
  assert.equal(section.layout.z_index, 0);
  assert.equal(section.layout.desktop.offset_x, 12);
  assert.equal(section.text_style.color, '#FFFFFF');
  assert.equal(section.responsive.mobile_visible, false);
  assert.equal(section.media_presentation.focal_x, 75);
  assert.equal(Object.hasOwn(section, 'style'), false);
  assert.equal(Object.hasOwn(section, 'css'), false);
  assert.equal(Object.hasOwn(section.text_style, 'css'), false);
});

test('Nuxt CMS page reader preserves editable proof values and units', async () => {
  const reader = createCmsPageReader({
    endpoint: 'https://cms.example.test/items/pages',
    fetchImpl: async () => Response.json({ data: [{
      ...publishedPage,
      sections: [{ id: 'proof-years', title: '技术沉淀', value: 30, unit: 'YEARS', unsafe: 'drop' }]
    }] })
  });

  const section = (await reader.get('home')).data.sections[0];
  assert.equal(section.value, 30);
  assert.equal(section.unit, 'YEARS');
  assert.equal(Object.hasOwn(section, 'unsafe'), false);
});

test('Nuxt CMS page reader preserves the explicitly modeled manufacturing hero copy', async () => {
  const reader = createCmsPageReader({
    endpoint: 'https://cms.example.test/items/pages',
    fetchImpl: async () => Response.json({ data: [{
      ...publishedPage,
      slug: 'manufacturing',
      sections: [{
        id: 'hero', title: '先进制造', body: '全产业链制造与严格质量控制。',
        processTitle: 'World top class production process', outputText: '年产量可达10000台',
        visible_copy_materialized: true
      }]
    }] })
  });

  const section = (await reader.get('manufacturing')).data.sections[0];
  assert.equal(section.processTitle, 'World top class production process');
  assert.equal(section.outputText, '年产量可达10000台');
  assert.equal(Object.hasOwn(section, 'visible_copy_materialized'), false);
});

test('Nuxt CMS page reader bounds pagination and repeated item presentation', async () => {
  const reader = createCmsPageReader({
    endpoint: 'https://cms.example.test/items/pages',
    fetchImpl: async () => Response.json({ data: [{
      ...publishedPage,
      sections: [{ id: 'pagination', pagination: { page_size: 999, sort: 'unsafe', previous_label: '上一批' }, items: [{ title: '节点', anchor: 'top-left', text_style: { enabled: true, size_desktop: 36 }, css: 'display:none' }] }]
    }] })
  });
  const section = (await reader.get('home')).data.sections[0];
  assert.deepEqual(section.pagination, { page_size: 6, sort: 'manual', previous_label: '上一批' });
  assert.equal(section.items[0].anchor, 'top-left');
  assert.equal(section.items[0].text_style.enabled, true);
  assert.equal(section.items[0].text_style.size_desktop, 36);
  assert.equal(Object.hasOwn(section.items[0], 'css'), false);
});

test('Nuxt CMS page reader keeps modeled manufacturing process-node copy while dropping arbitrary fields', async () => {
  const reader = createCmsPageReader({
    endpoint: 'https://cms.example.test/items/pages',
    fetchImpl: async () => Response.json({ data: [{
      ...publishedPage,
      slug: 'manufacturing',
      sections: [{
        id: 'process',
        items: [{
          title: '精密加工基准',
          description: '控制关键基准与精度。',
          anchor: 'top-left',
          connection_label: '进入装配',
          sort_order: 2,
          internal_note: 'never public'
        }]
      }]
    }] })
  });

  const item = (await reader.get('manufacturing')).data.sections[0].items[0];
  assert.deepEqual(item, {
    title: '精密加工基准',
    description: '控制关键基准与精度。',
    anchor: 'top-left',
    connection_label: '进入装配',
    sort_order: 2
  });
});

test('Nuxt CMS page reader preserves normalized scalar field presentation without exposing arbitrary styles', async () => {
  const reader = createCmsPageReader({
    endpoint: 'https://cms.example.test/items/pages',
    fetchImpl: async () => Response.json({ data: [{
      ...publishedPage,
      sections: [{
        id: 'product-task',
        title: '选型咨询',
        field_presentation: {
          title: { layout: { enabled: true, desktop: { offset_x: 7, offset_y: -3 } }, text_style: { enabled: true, size_desktop: 44, css: 'position:fixed' } },
          'bad.key': { layout: { enabled: true } }
        }
      }]
    }] })
  });
  const section = (await reader.get('home')).data.sections[0];
  assert.equal(section.field_presentation.title.layout.desktop.offset_x, 7);
  assert.equal(section.field_presentation.title.text_style.size_desktop, 44);
  assert.equal(Object.hasOwn(section.field_presentation.title.text_style, 'css'), false);
  assert.equal(Object.hasOwn(section.field_presentation, 'bad.key'), false);
});

test('Nuxt CMS page reader resolves media asset IDs nested in repeated page items', async () => {
  const reader = createCmsPageReader({
    endpoint: 'https://cms.example.test/items/pages',
    mediaAssetsEndpoint: 'https://cms.example.test/items/media_assets',
    publicAssetBaseUrl: 'https://cms.example.test',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url) => {
      const request = new URL(url);
      if (request.pathname.endsWith('/media_assets')) return Response.json({ data: [
        { id: 21, file_id: 'nested-image', media_type: 'image', mime_type: 'image/jpeg', status: 'published', publication_state: 'published' },
        { id: 22, file_id: 'nested-video', media_type: 'video', mime_type: 'video/mp4', status: 'published', publication_state: 'published' },
        { id: 23, file_id: 'draft-poster', media_type: 'image', mime_type: 'image/jpeg', status: 'draft', publication_state: 'unpublished' }
      ] });
      return Response.json({ data: [{
        ...publishedPage,
        sections: [{ id: 'gallery', items: [{ title: '设备', image_asset_id: 21, media: [{ media_asset_id: 22, poster_asset_id: 23 }] }] }]
      }] });
    }
  });

  const section = (await reader.get('home')).data.sections[0];
  assert.equal(section.items[0].image, 'https://cms.example.test/assets/nested-image');
  assert.equal(section.items[0].media[0].path, 'https://cms.example.test/assets/nested-video');
  assert.equal(Object.hasOwn(section.items[0].media[0], 'posterPath'), false);
});

test('Nuxt CMS page reader preserves controlled service support copy for the public page', async () => {
  const reader = createCmsPageReader({
    endpoint: 'https://cms.example.test/items/pages',
    fetchImpl: async () => Response.json({ data: [{
      ...publishedPage,
      slug: 'service',
      sections: [{ id: 'support', content: {
        assistant_heading: '自定义助手标题',
        assistant_copy_json: '{"feedback_yes":"已解决"}',
        map_button_title: '自定义地图提示',
        step_1_body: '自定义第一步',
        faq_1_question: '自定义 FAQ 问题',
        contact_sales_cta: '自定义选型入口'
      } }]
    }] })
  });
  const section = (await reader.get('service')).data.sections[0];
  assert.equal(section.content.assistant_heading, '自定义助手标题');
  assert.equal(section.content.assistant_copy_json, '{"feedback_yes":"已解决"}');
  assert.equal(section.content.map_button_title, '自定义地图提示');
  assert.equal(section.content.step_1_body, '自定义第一步');
  assert.equal(section.content.faq_1_question, '自定义 FAQ 问题');
  assert.equal(section.content.contact_sales_cta, '自定义选型入口');
});

test('Nuxt CMS page reader preserves the latest page cache and otherwise returns static fallback', async () => {
  let online = true;
  const reader = createCmsPageReader({
    endpoint: 'https://cms.example.test/items/pages', cacheTtlMs: 0,
    fetchImpl: async () => online ? Response.json({ data: [publishedPage] }) : new Response('', { status: 503 })
  });

  await reader.get('home');
  online = false;
  assert.deepEqual(await reader.get('home'), { data: publishedPage, cache: 'stale', source: 'cms' });
  const noCacheReader = createCmsPageReader({ endpoint: 'https://cms.example.test/items/pages', fetchImpl: async () => new Response('', { status: 503 }) });
  assert.deepEqual(await noCacheReader.get('about'), { data: null, cache: 'unavailable', source: 'static' });
});

test('Nuxt CMS page reader rejects unsafe page slugs before contacting the CMS', async () => {
  const reader = createCmsPageReader({ endpoint: 'https://cms.example.test/items/pages', fetchImpl: async () => { throw new Error('not reached'); } });
  await assert.rejects(reader.get('../users'), /page slug/i);
});

test('Nuxt CMS page reader sends a configured server-only CMS token upstream', async () => {
  let headers;
  const reader = createCmsPageReader({ endpoint: 'https://cms.example.test/items/pages', accessToken: 'server-only-token', fetchImpl: async (_url, options) => {
    headers = options.headers;
    return Response.json({ data: [] });
  } });
  await reader.get('home');
  assert.equal(headers.Authorization, 'Bearer server-only-token');
});

test('Nuxt homepage section reader preserves structured reason fields and approved media', async () => {
  const reader = createCmsPageReader({
    endpoint: 'https://cms.example.test/items/pages',
    homepageSectionsEndpoint: 'https://cms.example.test/items/homepage_sections',
    mediaAssetsEndpoint: 'https://cms.example.test/items/media_assets',
    publicAssetBaseUrl: 'https://cms.example.test',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url) => {
      const request = new URL(url);
      if (request.pathname.endsWith('/media_assets')) return Response.json({ data: [
        { id: 101, file_id: 'reason-machine', media_type: 'image', mime_type: 'image/jpeg', status: 'published', publication_state: 'published' },
        { id: 102, file_id: 'reason-icon', media_type: 'image', mime_type: 'image/png', status: 'published', publication_state: 'published' }
      ] });
      if (request.pathname.endsWith('/homepage_sections')) return Response.json({ data: [{
        id: 701,
        section_key: 'performance', title: '增效降损', content: { shortTitle: '效率', introTitle: '效率', introDetail: 'CMS 说明', mode: 'machine' },
        media: [{ media_asset_id: 101, role: 'image' }, { media_asset_id: 102, role: 'icon' }], sort_order: 1, enabled: true,
        status: 'published', publication_state: 'published', published_at: '2026-07-31T00:00:00.000Z'
      }] });
      return Response.json({ data: [{ ...publishedPage, sections: [{ id: 'hero', title: '首屏' }] }] });
    }
  });
  const result = await reader.get('home');
  const section = result.data.sections.find((entry) => entry.id === 'performance');
  assert.equal(section.cms_item_id, '701');
  assert.equal(section.cms_collection, 'homepage_sections');
  assert.equal(section.shortTitle, '效率');
  assert.equal(section.introDetail, 'CMS 说明');
  assert.equal(section.image, 'https://cms.example.test/assets/reason-machine');
  assert.equal(section.icon, 'https://cms.example.test/assets/reason-icon');
});

test('Nuxt homepage section reader resolves nested item media assets', async () => {
  const reader = createCmsPageReader({
    endpoint: 'https://cms.example.test/items/pages',
    homepageSectionsEndpoint: 'https://cms.example.test/items/homepage_sections',
    mediaAssetsEndpoint: 'https://cms.example.test/items/media_assets',
    publicAssetBaseUrl: 'https://cms.example.test',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url) => {
      const request = new URL(url);
      if (request.pathname.endsWith('/media_assets')) return Response.json({ data: [
        { id: 111, file_id: 'marquee-image', media_type: 'image', mime_type: 'image/jpeg', status: 'published', publication_state: 'published' }
      ] });
      if (request.pathname.endsWith('/homepage_sections')) return Response.json({ data: [{
        id: 702,
        section_key: 'marquee', title: '合作品牌', content: { items: [{ title: '品牌', image_asset_id: 111 }] },
        sort_order: 1, enabled: true, status: 'published', publication_state: 'published', published_at: '2026-07-31T00:00:00.000Z'
      }] });
      return Response.json({ data: [{ ...publishedPage, sections: [{ id: 'hero', title: '首屏' }] }] });
    }
  });

  const section = (await reader.get('home')).data.sections.find((entry) => entry.id === 'marquee');
  assert.equal(section.cms_item_id, '702');
  assert.equal(section.content.items[0].image, 'https://cms.example.test/assets/marquee-image');
});
