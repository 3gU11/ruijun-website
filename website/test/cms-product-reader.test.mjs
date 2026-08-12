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
