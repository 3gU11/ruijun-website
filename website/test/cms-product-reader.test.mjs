import assert from 'node:assert/strict';
import test from 'node:test';

const { createCmsProductReader } = await import('../server/services/cms-product-reader.mjs');

const publishedSeries = {
  series_code: 'fr-xs', slug: 'fr-xs', name: 'FR-XS', sort_order: 1,
  status: 'published', publication_state: 'published', published_at: '2026-07-31T00:00:00.000Z'
};
const publishedModel = {
  series_code: 'fr-xs', model_code: 'fr400xs', name: 'FR400XS',
  status: 'published', publication_state: 'published', published_at: '2026-07-31T00:00:00.000Z'
};

test('Nuxt CMS product reader exposes only published series and requested models', async () => {
  const requests = [];
  const reader = createCmsProductReader({
    seriesEndpoint: 'https://cms.example.test/items/product_series', modelsEndpoint: 'https://cms.example.test/items/product_models',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url) => {
      const request = new URL(url);
      requests.push(request);
      return Response.json({ data: request.pathname.endsWith('product_models')
        ? [publishedModel, { ...publishedModel, status: 'draft' }, { ...publishedModel, series_code: 'ft-xs' }]
        : [publishedSeries, { ...publishedSeries, status: 'draft' }] });
    }
  });

  assert.deepEqual(await reader.listSeries(), { data: [publishedSeries], cache: 'fresh', source: 'cms' });
  assert.deepEqual(await reader.listModels('fr-xs'), { data: [publishedModel], cache: 'fresh', source: 'cms' });
  assert.equal(requests[1].searchParams.get('filter[series_code][_eq]'), 'fr-xs');
  assert.equal(requests[1].searchParams.get('sort'), 'model_code');
  assert.match(requests[0].searchParams.get('fields'), /(^|,)id(,|$)/);
  assert.match(requests[1].searchParams.get('fields'), /(^|,)id(,|$)/);
});

test('Nuxt CMS product reader exposes only controlled series-card presentation fields', async () => {
  const reader = createCmsProductReader({
    seriesEndpoint: 'https://cms.example.test/items/product_series', modelsEndpoint: '',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async () => Response.json({ data: [{
      ...publishedSeries,
      presentation: {
        field_presentation: {
          name: { text_style: { enabled: true, size_desktop: 34, color: '#124578', css: 'position:fixed' } },
          private_note: { text_style: { enabled: true, size_desktop: 120 } }
        }
      }
    }] })
  });

  const result = await reader.listSeries();
  assert.equal(result.data[0].presentation.field_presentation.name.text_style.size_desktop, 34);
  assert.equal(Object.hasOwn(result.data[0].presentation.field_presentation, 'private_note'), false);
  assert.doesNotMatch(JSON.stringify(result.data[0].presentation), /position:fixed/);
});

test('Nuxt CMS product reader exposes a public product list and optionally filters it by series', async () => {
  const requests = [];
  const reader = createCmsProductReader({
    seriesEndpoint: 'https://cms.example.test/items/product_series', modelsEndpoint: 'https://cms.example.test/items/product_models',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url) => {
      const request = new URL(url);
      requests.push(request);
      return Response.json({ data: [
        { ...publishedModel, slug: 'fr400xs' },
        { ...publishedModel, series_code: 'ft-xs', model_code: 'ft400xs', slug: 'ft400xs' },
        { ...publishedModel, slug: 'draft-model', status: 'draft' },
        { ...publishedModel, slug: 'scheduled-model', published_at: '2026-08-02T00:00:00.000Z' }
      ] });
    }
  });

  assert.deepEqual(await reader.listProducts(), {
    data: [
      { ...publishedModel, slug: 'fr400xs' },
      { ...publishedModel, series_code: 'ft-xs', model_code: 'ft400xs', slug: 'ft400xs' }
    ], cache: 'fresh', source: 'cms'
  });
  assert.deepEqual(await reader.listProducts('fr-xs'), {
    data: [{ ...publishedModel, slug: 'fr400xs' }], cache: 'fresh', source: 'cms'
  });
  assert.equal(requests[1].searchParams.get('filter[series_code][_eq]'), 'fr-xs');
  assert.equal(requests[0].searchParams.get('sort'), 'model_code');
  await assert.rejects(reader.listProducts('../admin'), /series code/i);
});

test('Nuxt CMS product reader fails closed for malformed model filters and degrades only to empty static data', async () => {
  const reader = createCmsProductReader({ seriesEndpoint: '', modelsEndpoint: '' });
  assert.deepEqual(await reader.listSeries(), { data: [], cache: 'unavailable', source: 'static' });
  await assert.rejects(reader.listModels('../admin'), /series code/i);
  assert.deepEqual(await reader.listModels('fr-xs'), { data: [], cache: 'unavailable', source: 'static' });
});

test('Nuxt CMS product reader exposes only the requested published product model', async () => {
  let requestedUrl;
  const reader = createCmsProductReader({
    seriesEndpoint: 'https://cms.example.test/items/product_series', modelsEndpoint: 'https://cms.example.test/items/product_models',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return Response.json({ data: [
        { ...publishedModel, slug: 'fr400xs' },
        { ...publishedModel, slug: 'fr500xs', status: 'draft' },
        { ...publishedModel, slug: 'other-model' }
      ] });
    }
  });

  assert.deepEqual(await reader.getModel('fr400xs'), { data: { ...publishedModel, slug: 'fr400xs' }, cache: 'fresh', source: 'cms' });
  assert.equal(requestedUrl.searchParams.get('filter[slug][_eq]'), 'fr400xs');
});

test('Nuxt CMS product reader merges only published independent parameters into the same public model version', async () => {
  const requests = [];
  const reader = createCmsProductReader({
    seriesEndpoint: '',
    modelsEndpoint: 'https://cms.example.test/items/product_models',
    parametersEndpoint: 'https://cms.example.test/items/product_parameters',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url) => {
      const request = new URL(url);
      requests.push(request);
      if (request.pathname.endsWith('/product_parameters')) {
        return Response.json({ data: [
          { model_code: 'fr400xs', field_name: 'XY 行程', value: '400*290', status: 'published', publication_state: 'published', published_at: '2026-07-31T00:00:00.000Z' },
          { model_code: 'fr400xs', field_name: '最大工件尺寸', value: 'draft-value', status: 'draft', publication_state: 'unpublished' }
        ] });
      }
      return Response.json({ data: [{ ...publishedModel, slug: 'fr400xs', parameters: { xyTravelMm: 'legacy-value' } }] });
    }
  });

  const result = await reader.getModel('fr400xs');

  assert.deepEqual(result.data?.parameters, { xyTravelMm: '400*290' });
  const parameterRequest = requests.find((request) => request.pathname.endsWith('/product_parameters'));
  assert.equal(parameterRequest.searchParams.get('filter[status][_eq]'), 'published');
  assert.equal(parameterRequest.searchParams.get('filter[publication_state][_eq]'), 'published');
  assert.doesNotMatch(parameterRequest.searchParams.get('fields'), /import_evidence/);
});

test('Nuxt CMS product reader keeps approved parameter units alongside values', async () => {
  const reader = createCmsProductReader({
    seriesEndpoint: '',
    modelsEndpoint: 'https://cms.example.test/items/product_models',
    parametersEndpoint: 'https://cms.example.test/items/product_parameters',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url) => {
      const request = new URL(url);
      if (request.pathname.endsWith('/product_parameters')) return Response.json({ data: [
        { model_code: 'fr400xs', group_name: '基础参数', field_name: 'XY 行程', value: '400*290', unit: 'mm', sort_order: 1, presentation: { field_presentation: { field_name: { text_style: { enabled: true, size_desktop: 20, color: '#123456' } }, internal: { text_style: { enabled: true, size_desktop: 120 } } } }, status: 'published', publication_state: 'published' }
      ] });
      return Response.json({ data: [{ ...publishedModel, slug: 'fr400xs' }] });
    }
  });

  const result = await reader.getModel('fr400xs');
  assert.deepEqual(result.data?.parameters, { xyTravelMm: '400*290' });
  assert.deepEqual(result.data?.parameter_units, { xyTravelMm: 'mm' });
  assert.deepEqual(result.data?.parameter_groups, [{ name: '基础参数', items: [{ label: 'XY 行程', key: 'xyTravelMm', value: '400*290', unit: 'mm', presentation: { field_presentation: { field_name: { layout: { enabled: false, template: 'default', align_x: 'left', align_y: 'top', width: 'normal', gap: 'medium', order: 0, z_index: 0, desktop: { offset_x: 0, offset_y: 0 }, mobile: { offset_x: 0, offset_y: 0 } }, text_style: { enabled: true, preset: 'inherit', weight: 400, size_desktop: 20, size_mobile: 0, line_height: 1.4, color: '#123456', max_width: 'normal' }, responsive: { enabled: false, desktop_visible: true, tablet_visible: true, mobile_visible: true, mobile_template: 'inherit' }, media_presentation: { enabled: false, fit: 'cover', focal_x: 50, focal_y: 50, overlay: 'none', poster_asset_id: '' } } } } }] }]);
});

test('Nuxt CMS product reader exposes only safe, displayable resources, case studies, and media for a published model', async () => {
  const reader = createCmsProductReader({
    seriesEndpoint: '', modelsEndpoint: 'https://cms.example.test/items/product_models',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async () => Response.json({ data: [{
      ...publishedModel,
      slug: 'fr400xs',
      resources: [
        { name: '产品手册', type: 'pdf', url: 'https://assets.example.test/fr400xs.pdf', internal_note: 'do-not-render' },
        { name: '不安全链接', type: 'pdf', url: 'javascript:alert(1)' }
      ],
      case_studies: [
        { title: '模具加工案例', summary: '已审核的公开案例', url: '/cases/mould', customer_contact: 'do-not-render' },
        { title: '不安全案例', url: 'data:text/plain,unsafe' }
      ],
      media: [{ path: '/assets/products/fr400xs.jpg', alt: 'FR400XS 机床', operator_note: 'do-not-render' }, { path: '//unsafe.example.test/image.jpg' }]
    }] })
  });

  const result = await reader.getModel('fr400xs');
  assert.deepEqual(result.data?.resources, [{ title: '产品手册', type: 'pdf', url: 'https://assets.example.test/fr400xs.pdf' }]);
  assert.deepEqual(result.data?.case_studies, [{ title: '模具加工案例', summary: '已审核的公开案例', url: '/cases/mould' }]);
  assert.deepEqual(result.data?.media, [{ path: '/assets/products/fr400xs.jpg', alt: 'FR400XS 机床' }]);
});

test('Nuxt CMS product reader resolves published media asset IDs without exposing CMS metadata', async () => {
  const reader = createCmsProductReader({
    seriesEndpoint: '', modelsEndpoint: 'https://cms.example.test/items/product_models', mediaAssetsEndpoint: 'https://cms.example.test/items/media_assets',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url) => {
      const request = new URL(url);
      if (request.pathname.endsWith('/media_assets')) return Response.json({ data: [
        { id: 7, file_id: 'approved-file', alt_text: '审核替代文本', status: 'published', publication_state: 'published', published_at: '2026-07-31T00:00:00.000Z' }
      ] });
      return Response.json({ data: [{ ...publishedModel, slug: 'fr400xs', media: [{ media_asset_id: 7, alt: '产品自定义替代文本' }] }] });
    }
  });

  const result = await reader.getModel('fr400xs');
  assert.deepEqual(result.data?.media, [{ path: 'https://cms.example.test/assets/approved-file', alt: '产品自定义替代文本' }]);
  assert.deepEqual(Object.keys(result.data?.media?.[0] || {}).sort(), ['alt', 'path']);
});

test('Nuxt CMS product reader resolves a published product attachment asset into a safe download URL', async () => {
  const reader = createCmsProductReader({
    seriesEndpoint: '', modelsEndpoint: 'https://cms.example.test/items/product_models', mediaAssetsEndpoint: 'https://cms.example.test/items/media_assets',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url) => {
      const request = new URL(url);
      if (request.pathname.endsWith('/media_assets')) return Response.json({ data: [
        { id: 41, file_id: 'product-manual-pdf', media_type: 'document', mime_type: 'application/pdf', status: 'published', publication_state: 'published' }
      ] });
      return Response.json({ data: [{ ...publishedModel, slug: 'fr400xs', resources: [
        { title: '产品说明书', type: 'PDF', media_asset_id: 41 },
        { title: '无效附件', media_asset_id: 'missing' }
      ] }] });
    }
  });

  const result = await reader.getModel('fr400xs');
  assert.deepEqual(result.data?.resources, [{ title: '产品说明书', type: 'PDF', url: 'https://cms.example.test/assets/product-manual-pdf' }]);
});

test('Nuxt CMS product reader keeps the protected preview path for a draft product attachment', async () => {
  const reader = createCmsProductReader({
    seriesEndpoint: '', modelsEndpoint: 'https://cms.example.test/items/product_models', mediaAssetsEndpoint: '',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async () => Response.json({ data: [{ ...publishedModel, slug: 'fr400xs', resources: [
      { title: '草稿产品说明书', type: 'PDF', media_asset_id: 41, path: '/api/preview/media/41' }
    ] }] })
  });

  const result = await reader.getModel('fr400xs');
  assert.deepEqual(result.data?.resources, [{ title: '草稿产品说明书', type: 'PDF', url: '/api/preview/media/41' }]);
});

test('Nuxt CMS product reader resolves structured feature and drawing media without exposing raw IDs', async () => {
  const reader = createCmsProductReader({
    seriesEndpoint: '', modelsEndpoint: 'https://cms.example.test/items/product_models', mediaAssetsEndpoint: 'https://cms.example.test/items/media_assets',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url) => {
      const request = new URL(url);
      if (request.pathname.endsWith('/media_assets')) return Response.json({ data: [
        { id: 21, file_id: 'feature-file', status: 'published', publication_state: 'published' },
        { id: 22, file_id: 'drawing-file', status: 'published', publication_state: 'published' },
        { id: 23, file_id: 'label-file', status: 'published', publication_state: 'published' }
      ] });
      return Response.json({ data: [{ ...publishedModel, slug: 'fr400xs', configuration: {
        labels: { technical: '技术参数', drawing: '工程视图', technical_image_asset_id: '23' },
        features: [{ label: '自动穿丝', detail: '全自动', media_asset_id: '21' }],
        drawings: [{ title: 'FR400', caption: '尺寸图', media_asset_id: '22' }]
      } }] });
    }
  });

  const configuration = (await reader.getModel('fr400xs')).data.configuration;
  assert.equal(configuration.labels.technicalImage, 'https://cms.example.test/assets/label-file');
  assert.deepEqual(configuration.features, [{ label: '自动穿丝', detail: '全自动', note: '', image: 'https://cms.example.test/assets/feature-file' }]);
  assert.deepEqual(configuration.drawings, [{ image: 'https://cms.example.test/assets/drawing-file', title: 'FR400', caption: '尺寸图' }]);
  assert.doesNotMatch(JSON.stringify(configuration), /media_asset_id/);
});

test('Nuxt CMS product reader retains only controlled feature presentation settings', async () => {
  const reader = createCmsProductReader({
    seriesEndpoint: '', modelsEndpoint: 'https://cms.example.test/items/product_models',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async () => Response.json({ data: [{ ...publishedModel, slug: 'fr400xs', configuration: {
      features: [{ label: '自动穿丝', detail: '全自动' }],
      field_presentation: {
        features_0_label: { layout: { enabled: true, desktop: { offset_x: 9, offset_y: -4 } }, text_style: { enabled: true, size_desktop: 34, weight: 700, line_height: 1.6, color: '#123456' } },
        unexpected_field: { text_style: { enabled: true, size_desktop: 120 } }
      }
    } }] })
  });

  const configuration = (await reader.getModel('fr400xs')).data.configuration;
  assert.deepEqual(configuration.features[0], { label: '自动穿丝', detail: '全自动', note: '' });
  assert.deepEqual(configuration.field_presentation, {
    features_0_label: {
      layout: { enabled: true, template: 'default', align_x: 'left', align_y: 'top', width: 'normal', gap: 'medium', order: 0, z_index: 0, desktop: { offset_x: 9, offset_y: -4 }, mobile: { offset_x: 0, offset_y: 0 } },
      text_style: { enabled: true, preset: 'inherit', weight: 700, size_desktop: 34, size_mobile: 0, line_height: 1.6, color: '#123456', max_width: 'normal' },
      responsive: { enabled: false, desktop_visible: true, tablet_visible: true, mobile_visible: true, mobile_template: 'inherit' },
      media_presentation: { enabled: false, fit: 'cover', focal_x: 50, focal_y: 50, overlay: 'none', poster_asset_id: '' }
    }
  });
});

test('Nuxt CMS product reader retains controlled presentation for a feature image', async () => {
  const reader = createCmsProductReader({
    seriesEndpoint: '', modelsEndpoint: 'https://cms.example.test/items/product_models',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async () => Response.json({ data: [{ ...publishedModel, slug: 'fr400xs', configuration: {
      features: [{ label: '自动穿丝', image: '/assets/feature.png' }],
      field_presentation: {
        features_0_image: { layout: { enabled: true, desktop: { offset_x: 8, offset_y: -3 } } },
        unexpected_field: { layout: { enabled: true, desktop: { offset_x: 30, offset_y: 30 } } }
      }
    } }] })
  });

  const configuration = (await reader.getModel('fr400xs')).data.configuration;
  assert.equal(configuration.features[0].image, '/assets/feature.png');
  assert.equal(configuration.field_presentation.features_0_image.layout.desktop.offset_x, 8);
  assert.equal(configuration.field_presentation.features_0_image.layout.desktop.offset_y, -3);
  assert.equal(Object.hasOwn(configuration.field_presentation, 'unexpected_field'), false);
});

test('Nuxt CMS product reader retains only controlled intro presentation settings', async () => {
  const reader = createCmsProductReader({
    seriesEndpoint: '', modelsEndpoint: 'https://cms.example.test/items/product_models',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async () => Response.json({ data: [{ ...publishedModel, slug: 'fr400xs', configuration: {
      intro: { title: '自动穿丝系列', subtitle: '精密加工', scene: '精密零件', body: '产品说明' },
      field_presentation: {
        intro_title: { layout: { enabled: true, desktop: { offset_x: 5, offset_y: -4 } }, text_style: { enabled: true, size_desktop: 36, weight: 700, line_height: 1.6, color: '#123456', css: 'position:fixed' } },
        intro_private: { text_style: { enabled: true, size_desktop: 120 } }
      }
    } }] })
  });

  const presentation = (await reader.getModel('fr400xs')).data.configuration.field_presentation;
  assert.equal(presentation.intro_title.layout.desktop.offset_x, 5);
  assert.equal(presentation.intro_title.text_style.size_desktop, 36);
  assert.equal(Object.hasOwn(presentation, 'intro_private'), false);
  assert.doesNotMatch(JSON.stringify(presentation), /position:fixed/);
});

test('Nuxt CMS product reader retains only the controlled model-code presentation', async () => {
  const reader = createCmsProductReader({
    seriesEndpoint: '', modelsEndpoint: 'https://cms.example.test/items/product_models',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async () => Response.json({ data: [{ ...publishedModel, slug: 'fl1610', model_code: 'FL1610XS(pro)', presentation: {
      field_presentation: {
        model_code: { layout: { enabled: true, desktop: { offset_x: 4, offset_y: -2 } }, text_style: { enabled: true, size_desktop: 24, color: '#123456', css: 'position:fixed' } },
        internal_note: { text_style: { enabled: true, size_desktop: 120 } }
      }
    } }] })
  });

  const presentation = (await reader.getModel('fl1610')).data.presentation;
  assert.equal(presentation.field_presentation.model_code.layout.desktop.offset_x, 4);
  assert.equal(presentation.field_presentation.model_code.text_style.size_desktop, 24);
  assert.equal(Object.hasOwn(presentation.field_presentation, 'internal_note'), false);
  assert.doesNotMatch(JSON.stringify(presentation), /position:fixed/);
});

test('Nuxt CMS product reader resolves controlled workstation intro and machine media', async () => {
  const reader = createCmsProductReader({
    seriesEndpoint: '', modelsEndpoint: 'https://cms.example.test/items/product_models', mediaAssetsEndpoint: 'https://cms.example.test/items/media_assets',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url) => {
      const request = new URL(url);
      if (request.pathname.endsWith('/media_assets')) return Response.json({ data: [{ id: 31, file_id: 'machine-file', status: 'published', publication_state: 'published' }] });
      return Response.json({ data: [{ ...publishedModel, slug: 'workstation', configuration: { machine_asset_id: '31', intro: { title: '后台标题', subtitle: '后台副标题', scene: '后台场景', body: '后台正文' } } }] });
    }
  });
  const configuration = (await reader.getModel('workstation')).data.configuration;
  assert.deepEqual(configuration.intro, { title: '后台标题', subtitle: '后台副标题', scene: '后台场景', body: '后台正文' });
  assert.equal(configuration.machineImage, 'https://cms.example.test/assets/machine-file');
  assert.doesNotMatch(JSON.stringify(configuration), /machine_asset_id/);
});

test('Nuxt CMS product reader sends a configured server-only CMS token upstream', async () => {
  let headers;
  const reader = createCmsProductReader({ seriesEndpoint: 'https://cms.example.test/items/product_series', modelsEndpoint: '', accessToken: 'server-only-token', fetchImpl: async (_url, options) => {
    headers = options.headers;
    return Response.json({ data: [] });
  } });
  await reader.listSeries();
  assert.equal(headers.Authorization, 'Bearer server-only-token');
});

test('Nuxt CMS product reader uses one published product release snapshot for lists, details, and parameters', async () => {
  const release = {
    release_key: 'main', version: 4, source_hash: 'hash', status: 'published', publication_state: 'published',
    published_at: '2026-07-31T00:00:00.000Z',
    snapshot: {
      schema_version: 1,
      series: [{ series_code: 'fr-xs', slug: 'fr-xs', name: 'FR-XS', sort_order: 1 }],
      models: [{ series_code: 'fr-xs', model_code: 'fr400xs', slug: 'fr400xs', name: 'FR400XS', parameters: { legacy: 'old' } }],
      parameters: [{ model_code: 'fr400xs', field_name: 'XY 行程', value: '400*290', sort_order: 1 }]
    }
  };
  const requests = [];
  const reader = createCmsProductReader({
    seriesEndpoint: 'https://cms.example.test/items/product_series',
    modelsEndpoint: 'https://cms.example.test/items/product_models',
    parametersEndpoint: 'https://cms.example.test/items/product_parameters',
    releaseEndpoint: 'https://cms.example.test/items/product_release_snapshots',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url) => {
      requests.push(new URL(url));
      if (new URL(url).pathname.endsWith('product_release_snapshots')) return Response.json({ data: [release] });
      throw new Error('release should prevent legacy product reads');
    }
  });

  assert.equal((await reader.listSeries()).data[0].name, 'FR-XS');
  assert.equal((await reader.listProducts()).data[0].parameters.xyTravelMm, '400*290');
  assert.equal((await reader.getModel('fr400xs')).data.parameters.xyTravelMm, '400*290');
  assert.equal(requests.filter((url) => url.pathname.endsWith('product_release_snapshots')).length, 1);
  assert.equal(requests.some((url) => url.pathname.endsWith('product_parameters')), false);
});

test('Nuxt CMS product release snapshot resolves product-series cover asset IDs before exposing cards', async () => {
  const release = {
    release_key: 'main', version: 5, source_hash: 'hash-series-cover', status: 'published', publication_state: 'published',
    published_at: '2026-07-31T00:00:00.000Z',
    snapshot: {
      schema_version: 1,
      series: [{ ...publishedSeries, cover_asset: '77' }],
      models: [],
      parameters: []
    }
  };
  const requests = [];
  const reader = createCmsProductReader({
    seriesEndpoint: 'https://cms.example.test/items/product_series',
    modelsEndpoint: 'https://cms.example.test/items/product_models',
    mediaAssetsEndpoint: 'https://cms.example.test/items/media_assets',
    releaseEndpoint: 'https://cms.example.test/items/product_release_snapshots',
    now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url) => {
      const request = new URL(url);
      requests.push(request);
      if (request.pathname.endsWith('product_release_snapshots')) return Response.json({ data: [release] });
      if (request.pathname.endsWith('media_assets')) return Response.json({ data: [
        { id: 77, file_id: 'series-cover-file', mime_type: 'image/png', media_type: 'image', status: 'published', publication_state: 'published', published_at: '2026-07-31T00:00:00.000Z' }
      ] });
      throw new Error('release snapshot should prevent legacy product reads');
    }
  });

  const result = await reader.listSeries();
  assert.equal(result.data[0].cover_asset, 'https://cms.example.test/assets/series-cover-file');
  const mediaRequest = requests.find((request) => request.pathname.endsWith('media_assets'));
  assert.equal(mediaRequest.searchParams.get('filter[id][_in]'), '77');
});

test('Nuxt CMS product reader does not fall back to independently published rows when release snapshots are configured', async () => {
  const requests = [];
  const reader = createCmsProductReader({
    seriesEndpoint: 'https://cms.example.test/items/product_series',
    modelsEndpoint: 'https://cms.example.test/items/product_models',
    releaseEndpoint: 'https://cms.example.test/items/product_release_snapshots',
    fetchImpl: async (url) => {
      const request = new URL(url);
      requests.push(request);
      if (request.pathname.endsWith('product_release_snapshots')) return Response.json({ data: [] });
      return Response.json({ data: [publishedModel] });
    }
  });

  assert.deepEqual(await reader.listProducts(), { data: [], cache: 'unavailable', source: 'cms' });
  assert.equal(requests.some((url) => url.pathname.endsWith('product_models')), false);
});
