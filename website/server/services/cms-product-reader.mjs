function isPublished(record, now) {
  if (record?.status !== 'published' || record?.publication_state !== 'published') return false;
  if (!record.published_at) return true;
  const publishedAt = Date.parse(record.published_at);
  return Number.isFinite(publishedAt) && publishedAt <= now;
}

function validSeriesCode(value) {
  const seriesCode = String(value || '').trim();
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(seriesCode)) throw new TypeError('series code is invalid');
  return seriesCode;
}

function validProductSlug(value) {
  const slug = String(value || '').trim();
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) throw new TypeError('product slug is invalid');
  return slug;
}

function safeText(value) {
  return value == null ? '' : String(value).trim();
}

function parseSnapshot(value) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

const publicParameterKeys = Object.freeze({
  'XY 行程': 'xyTravelMm',
  'Z 轴行程': 'zAxisTravelMm',
  '最大工件尺寸': 'maxWorkpieceMm',
  '最大工件重量': 'maxWorkpieceWeightKg',
  '最大切割厚度': 'maxCuttingHeightMm',
  '最大锥度': 'maxTaperDegrees',
  '机床外形尺寸': 'machineDimensionsMm',
  '机床重量': 'machineWeightKg'
});

function publicParameterKey(record) {
  const fieldName = safeText(record?.field_name);
  return publicParameterKeys[fieldName] || fieldName;
}

function mergePublishedParameters(records, parameterRecords) {
  const grouped = new Map();
  const units = new Map();
  const parameterGroups = new Map();
  for (const parameter of Array.isArray(parameterRecords) ? parameterRecords : []) {
    const modelCode = safeText(parameter?.model_code);
    const key = publicParameterKey(parameter);
    const fieldName = safeText(parameter?.field_name) || key;
    const value = safeText(parameter?.value);
    if (!modelCode || !key || !value) continue;
    if (!grouped.has(modelCode)) grouped.set(modelCode, {});
    grouped.get(modelCode)[key] = value;
    const unit = safeText(parameter?.unit);
    if (unit) {
      if (!units.has(modelCode)) units.set(modelCode, {});
      units.get(modelCode)[key] = unit;
    }
    if (!parameterGroups.has(modelCode)) parameterGroups.set(modelCode, new Map());
    const groupName = safeText(parameter?.group_name) || '未分组';
    const groups = parameterGroups.get(modelCode);
    if (!groups.has(groupName)) groups.set(groupName, []);
    const presentation = safeParameterPresentation(parameter?.presentation);
    groups.get(groupName).push({ label: fieldName, key, value, ...(unit ? { unit } : {}), ...(presentation ? { presentation } : {}) });
  }
  return records.map((record) => {
    const modelCode = safeText(record?.model_code);
    const parameters = grouped.get(modelCode);
    const modelUnits = units.get(modelCode);
    const groups = parameterGroups.get(modelCode);
    return parameters && Object.keys(parameters).length
      ? {
        ...record,
        parameters,
        ...(modelUnits && Object.keys(modelUnits).length ? { parameter_units: modelUnits } : {}),
        ...(groups?.size ? { parameter_groups: [...groups.entries()].map(([name, items]) => ({ name, items })) } : {})
      }
      : record;
  });
}

function safePublicUrl(value) {
  const url = safeText(value);
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    return new URL(url).protocol === 'https:' ? url : '';
  } catch {
    return '';
  }
}

function boundedNumber(value, minimum, maximum, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : fallback;
}

function safeProductFeaturePresentation(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const layout = source.layout && typeof source.layout === 'object' && !Array.isArray(source.layout) ? source.layout : {};
  const desktop = layout.desktop && typeof layout.desktop === 'object' && !Array.isArray(layout.desktop) ? layout.desktop : {};
  const mobile = layout.mobile && typeof layout.mobile === 'object' && !Array.isArray(layout.mobile) ? layout.mobile : {};
  const text = source.text_style && typeof source.text_style === 'object' && !Array.isArray(source.text_style) ? source.text_style : {};
  const responsive = source.responsive && typeof source.responsive === 'object' && !Array.isArray(source.responsive) ? source.responsive : {};
  const media = source.media_presentation && typeof source.media_presentation === 'object' && !Array.isArray(source.media_presentation) ? source.media_presentation : {};
  return {
    layout: {
      enabled: layout.enabled === true, template: 'default', align_x: 'left', align_y: 'top', width: 'normal', gap: 'medium', order: 0, z_index: 0,
      desktop: { offset_x: boundedNumber(desktop.offset_x, -30, 30, 0), offset_y: boundedNumber(desktop.offset_y, -30, 30, 0) },
      mobile: { offset_x: boundedNumber(mobile.offset_x, -30, 30, 0), offset_y: boundedNumber(mobile.offset_y, -30, 30, 0) }
    },
    text_style: {
      enabled: text.enabled === true, preset: 'inherit', weight: boundedNumber(text.weight, 300, 800, 400), size_desktop: boundedNumber(text.size_desktop, 12, 120, 0),
      size_mobile: boundedNumber(text.size_mobile, 12, 72, 0), line_height: boundedNumber(text.line_height, 1, 2.2, 1.4),
      color: typeof text.color === 'string' && /^#[0-9a-f]{6}$/i.test(text.color.trim()) ? text.color.trim().toUpperCase() : '', max_width: 'normal'
    },
    responsive: { enabled: responsive.enabled === true, desktop_visible: responsive.desktop_visible !== false, tablet_visible: responsive.tablet_visible !== false, mobile_visible: responsive.mobile_visible !== false, mobile_template: 'inherit' },
    media_presentation: { enabled: media.enabled === true, fit: media.fit === 'contain' ? 'contain' : 'cover', focal_x: boundedNumber(media.focal_x, 0, 100, 50), focal_y: boundedNumber(media.focal_y, 0, 100, 50), overlay: 'none', poster_asset_id: '' }
  };
}

function safeFeatureFieldPresentations(value, allowedKeys) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const allowed = new Set(allowedKeys);
  return Object.fromEntries(Object.entries(source).slice(0, 32).flatMap(([key, presentation]) => {
    if (!allowed.has(key) || !/^(?:features_\d{1,2}_(label|detail|note|image)|intro_(title|subtitle|scene|body))$/.test(key) || !presentation || typeof presentation !== 'object' || Array.isArray(presentation)) return [];
    return [[key, safeProductFeaturePresentation(presentation)]];
  }));
}

function safeParameterPresentation(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value.field_presentation : null;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return undefined;
  const fields = Object.fromEntries(['field_name', 'value', 'unit'].flatMap((field) => {
    const presentation = source[field];
    return presentation && typeof presentation === 'object' && !Array.isArray(presentation)
      ? [[field, safeProductFeaturePresentation(presentation)]]
      : [];
  }));
  return Object.keys(fields).length ? { field_presentation: fields } : undefined;
}

function safeSeriesPresentation(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value.field_presentation : null;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return undefined;
  const fields = Object.fromEntries(['name', 'positioning'].flatMap((field) => {
    const presentation = source[field];
    return presentation && typeof presentation === 'object' && !Array.isArray(presentation)
      ? [[field, safeProductFeaturePresentation(presentation)]]
      : [];
  }));
  return Object.keys(fields).length ? { field_presentation: fields } : undefined;
}

function safeModelPresentation(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value.field_presentation : null;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return undefined;
  const fields = Object.fromEntries(['model_code'].flatMap((field) => {
    const presentation = source[field];
    return presentation && typeof presentation === 'object' && !Array.isArray(presentation)
      ? [[field, safeProductFeaturePresentation(presentation)]]
      : [];
  }));
  return Object.keys(fields).length ? { field_presentation: fields } : undefined;
}

function safeResources(entries, assets) {
  if (!Array.isArray(entries)) return [];
  return entries.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const title = safeText(entry.title) || safeText(entry.name);
    const url = assets.get(safeText(entry.media_asset_id))?.path || safePublicUrl(entry.url || entry.path || entry.asset);
    if (!title || !url) return [];
    const type = safeText(entry.type);
    return [{ title, ...(type ? { type } : {}), url }];
  });
}

function safeCaseStudies(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const title = safeText(entry.title);
    const url = safePublicUrl(entry.url || entry.path);
    if (!title || !url) return [];
    const summary = safeText(entry.summary);
    return [{ title, ...(summary ? { summary } : {}), url }];
  });
}

function safeMedia(entries, assets) {
  if (!Array.isArray(entries)) return [];
  return entries.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const path = safePublicUrl(entry.path || entry.url || entry.asset) || assets.get(String(entry.media_asset_id))?.path || '';
    if (!path) return [];
    const alt = safeText(entry.alt) || assets.get(String(entry.media_asset_id))?.alt || '';
    return [{ path, ...(alt ? { alt } : {}) }];
  });
}

function configurationAssetIds(value) {
  const configuration = parseSnapshot(value) || {};
  const labels = configuration.labels && typeof configuration.labels === 'object' ? configuration.labels : {};
  const entries = [configuration.machine_asset_id, labels.technical_image_asset_id, ...(Array.isArray(configuration.features) ? configuration.features.map((item) => item?.media_asset_id) : []), ...(Array.isArray(configuration.drawings) ? configuration.drawings.map((item) => item?.media_asset_id) : [])];
  return [...new Set(entries.map((id) => safeText(id)).filter(Boolean))];
}

function resourceAssetIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((entry) => safeText(entry?.media_asset_id)).filter(Boolean))];
}

function safeConfiguration(value, assets) {
  const source = parseSnapshot(value) || {};
  const labels = source.labels && typeof source.labels === 'object' && !Array.isArray(source.labels) ? source.labels : {};
  const intro = source.intro && typeof source.intro === 'object' && !Array.isArray(source.intro) ? source.intro : {};
  const technicalImage = safePublicUrl(labels.technicalImage || labels.technical_image) || assets.get(safeText(labels.technical_image_asset_id))?.path || '';
  const machineImage = safePublicUrl(source.machine_image || source.machineImage) || assets.get(safeText(source.machine_asset_id))?.path || '';
  const features = Array.isArray(source.features) ? source.features.flatMap((item) => {
    const label = safeText(item?.label);
    if (!label) return [];
    const image = safePublicUrl(item.image || item.path) || assets.get(safeText(item.media_asset_id))?.path || '';
    return [{ label, detail: safeText(item.detail), note: safeText(item.note), ...(image ? { image } : {}) }];
  }) : [];
  const drawings = Array.isArray(source.drawings) ? source.drawings.flatMap((item, index) => {
    const image = safePublicUrl(typeof item === 'string' ? item : item?.image || item?.path) || assets.get(safeText(item?.media_asset_id))?.path || '';
    if (!image) return [];
    return [{ image, title: safeText(item?.title || item?.label) || `VIEW ${index + 1}`, caption: safeText(item?.caption || item?.description) }];
  }) : [];
  const parameters = Array.isArray(source.parameters) ? source.parameters.flatMap((item) => {
    const label = safeText(item?.label || item?.name); const valueText = safeText(item?.value);
    return label && valueText ? [{ label, value: valueText, unit: safeText(item?.unit) }] : [];
  }) : [];
  const allowedFeaturePresentationKeys = [
    ...features.flatMap((_feature, index) => ['label', 'detail', 'note', 'image'].filter((field) => Object.hasOwn(_feature, field)).map((field) => `features_${index}_${field}`)),
    ...['title', 'subtitle', 'scene', 'body'].filter((field) => Object.hasOwn(intro, field)).map((field) => `intro_${field}`)
  ];
  const fieldPresentation = safeFeatureFieldPresentations(source.field_presentation, allowedFeaturePresentationKeys);
  return {
    intro: {
      title: safeText(intro.title),
      subtitle: safeText(intro.subtitle),
      scene: safeText(intro.scene),
      body: safeText(intro.body)
    },
    ...(machineImage ? { machineImage } : {}),
    labels: { technical: safeText(labels.technical), drawing: safeText(labels.drawing), ...(technicalImage ? { technicalImage } : {}) },
    features,
    drawings,
    parameters,
    ...(Object.keys(fieldPresentation).length ? { field_presentation: fieldPresentation } : {})
  };
}

function sanitizeProductRecord(record, assets = new Map()) {
  if (!record || typeof record !== 'object') return record;
  const product = { ...record };
  if (Object.hasOwn(product, 'resources')) product.resources = safeResources(product.resources, assets);
  if (Object.hasOwn(product, 'case_studies')) product.case_studies = safeCaseStudies(product.case_studies);
  if (Object.hasOwn(product, 'media')) product.media = safeMedia(product.media, assets);
  if (Object.hasOwn(product, 'configuration')) product.configuration = safeConfiguration(product.configuration, assets);
  if (Object.hasOwn(product, 'cover_asset')) product.cover_asset = safePublicUrl(product.cover_asset) || assets.get(String(product.cover_asset))?.path || null;
  return product;
}

function sanitizeModelRecord(record, assets = new Map()) {
  const model = sanitizeProductRecord(record, assets);
  if (Object.hasOwn(model, 'presentation')) model.presentation = safeModelPresentation(model.presentation);
  return model;
}

function sanitizeSeriesRecord(record, assets = new Map()) {
  const series = sanitizeProductRecord(record, assets);
  if (Object.hasOwn(series, 'presentation')) series.presentation = safeSeriesPresentation(series.presentation);
  return series;
}

export function createCmsProductReader({ seriesEndpoint, modelsEndpoint, parametersEndpoint = '', releaseEndpoint = '', mediaAssetsEndpoint = '', publicAssetBaseUrl = '', accessToken = '', fetchImpl = fetch, now = () => Date.now(), cacheTtlMs = 30_000 }) {
  const cache = new Map();
  const headers = { Accept: 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };
  const mediaAssets = createCmsMediaAssetResolver({ endpoint: mediaAssetsEndpoint, publicAssetBaseUrl, accessToken, fetchImpl, now });

  async function readProductRelease() {
    if (!releaseEndpoint) return null;
    const timestamp = now();
    const cached = cache.get('product-release');
    if (cached && timestamp - cached.updatedAt < cacheTtlMs) return { snapshot: cached.data, cache: 'fresh', source: 'cms' };
    try {
      const url = new URL(releaseEndpoint);
      url.searchParams.set('filter[release_key][_eq]', 'main');
      url.searchParams.set('filter[status][_eq]', 'published');
      url.searchParams.set('filter[publication_state][_eq]', 'published');
      url.searchParams.set('sort', '-version');
      url.searchParams.set('limit', '1');
      url.searchParams.set('fields', 'release_key,version,source_hash,snapshot,status,publication_state,published_at');
      const response = await fetchImpl(url, { headers });
      if (!response.ok) throw new Error(`CMS product release responded ${response.status}`);
      const body = await response.json();
      const record = Array.isArray(body?.data) ? body.data[0] : null;
      const snapshot = parseSnapshot(record?.snapshot);
      if (!record || !isPublished(record, timestamp) || snapshot?.schema_version !== 1) return { snapshot: null, cache: 'unavailable', source: 'cms' };
      cache.set('product-release', { data: snapshot, updatedAt: timestamp });
      return { snapshot, cache: 'fresh', source: 'cms' };
    } catch {
      if (cached) return { snapshot: cached.data, cache: 'stale', source: 'cms' };
      return { snapshot: null, cache: 'unavailable', source: 'static' };
    }
  }

  async function snapshotAssets(snapshot) {
    const models = Array.isArray(snapshot?.models) ? snapshot.models : [];
    const series = Array.isArray(snapshot?.series) ? snapshot.series : [];
    const assetIds = [
      ...series.flatMap((record) => collectMediaAssetIds(typeof record?.cover_asset === 'string' && !safePublicUrl(record.cover_asset)
        ? [{ media_asset_id: record.cover_asset }] : [])),
      ...models.flatMap((record) => [
      ...collectMediaAssetIds(record.media),
      ...configurationAssetIds(record.configuration),
      ...resourceAssetIds(record.resources),
      ...collectMediaAssetIds(typeof record.cover_asset === 'string' && !safePublicUrl(record.cover_asset) ? [{ media_asset_id: record.cover_asset }] : [])
      ])
    ];
    return mediaAssets.resolve(assetIds);
  }

  async function snapshotProducts() {
    const release = await readProductRelease();
    if (!release || !release.snapshot) return release;
    const snapshot = release.snapshot;
    const assets = await snapshotAssets(snapshot);
    const models = mergePublishedParameters(
      (Array.isArray(snapshot.models) ? snapshot.models : []).map((record) => sanitizeModelRecord(record, assets)),
      Array.isArray(snapshot.parameters) ? snapshot.parameters : []
    );
    return { ...release, series: (Array.isArray(snapshot.series) ? snapshot.series : []).map((record) => sanitizeSeriesRecord(record, assets)), models };
  }

  async function list({ cacheKey, endpoint, fields, filters = {}, predicate = () => true, limit, sort, sanitize = sanitizeProductRecord }) {
    if (!endpoint) return { data: [], cache: 'unavailable', source: 'static' };
    const timestamp = now();
    const cached = cache.get(cacheKey);
    if (cached && timestamp - cached.updatedAt < cacheTtlMs) return { data: cached.data, cache: 'fresh', source: 'cms' };
    try {
      const url = new URL(endpoint);
      url.searchParams.set('filter[status][_eq]', 'published');
      url.searchParams.set('filter[publication_state][_eq]', 'published');
      if (sort) url.searchParams.set('sort', sort);
      url.searchParams.set('fields', fields);
      if (limit) url.searchParams.set('limit', String(limit));
      for (const [field, value] of Object.entries(filters)) url.searchParams.set(`filter[${field}][_eq]`, value);
      const response = await fetchImpl(url, { headers });
      if (!response.ok) throw new Error(`CMS responded ${response.status}`);
      const body = await response.json();
      if (!Array.isArray(body?.data)) throw new Error('CMS product response is invalid');
      const records = body.data.filter((record) => isPublished(record, timestamp) && predicate(record));
      const assetIds = records.flatMap((record) => [
        ...collectMediaAssetIds(record.media),
        ...configurationAssetIds(record.configuration),
        ...resourceAssetIds(record.resources),
        ...collectMediaAssetIds(typeof record.cover_asset === 'string' && !safePublicUrl(record.cover_asset) ? [{ media_asset_id: record.cover_asset }] : [])
      ]);
      const assets = await mediaAssets.resolve(assetIds);
      const data = records.map((record) => sanitize(record, assets));
      cache.set(cacheKey, { data, updatedAt: timestamp });
      return { data, cache: 'fresh', source: 'cms' };
    } catch {
      if (cached) return { data: cached.data, cache: 'stale', source: 'cms' };
      return { data: [], cache: 'unavailable', source: 'static' };
    }
  }

  async function listPublishedParameters() {
    return list({
      cacheKey: 'parameters', endpoint: parametersEndpoint,
      fields: 'model_code,group_name,field_name,value,unit,presentation,sort_order,status,publication_state,published_at',
      sort: 'model_code,sort_order'
    });
  }

  return {
    async listSeries() {
      const snapshot = await snapshotProducts();
      if (snapshot) return { data: snapshot.snapshot ? snapshot.series : [], cache: snapshot.cache, source: snapshot.source };
      return list({
        cacheKey: 'series', endpoint: seriesEndpoint,
        fields: 'id,series_code,slug,name,positioning,presentation,scenarios,capabilities,cover_asset,sort_order,language,status,publication_state,published_at',
        sort: 'sort_order', sanitize: sanitizeSeriesRecord
      });
    },
    async listProducts(seriesCode) {
      const normalizedSeriesCode = seriesCode === undefined ? null : validSeriesCode(seriesCode);
      const snapshot = await snapshotProducts();
      if (snapshot) {
        const data = snapshot.snapshot ? snapshot.models.filter((record) => !normalizedSeriesCode || record.series_code === normalizedSeriesCode) : [];
        return { data, cache: snapshot.cache, source: snapshot.source };
      }
      const result = await list({
        cacheKey: `products:${normalizedSeriesCode || 'all'}`, endpoint: modelsEndpoint,
        fields: 'id,series_code,model_code,slug,name,parameters,configuration,presentation,media,resources,status,publication_state,published_at',
        filters: normalizedSeriesCode ? { series_code: normalizedSeriesCode } : {}, sort: 'model_code',
        predicate: normalizedSeriesCode ? (record) => record.series_code === normalizedSeriesCode : () => true,
        sanitize: sanitizeModelRecord
      });
      const parameterResult = await listPublishedParameters();
      return { ...result, data: mergePublishedParameters(result.data, parameterResult.data) };
    },
    async listModels(seriesCode) {
      const normalizedSeriesCode = validSeriesCode(seriesCode);
      const snapshot = await snapshotProducts();
      if (snapshot) return { data: snapshot.snapshot ? snapshot.models.filter((record) => record.series_code === normalizedSeriesCode) : [], cache: snapshot.cache, source: snapshot.source };
      const result = await list({
        cacheKey: `models:${normalizedSeriesCode}`, endpoint: modelsEndpoint,
        fields: 'id,series_code,model_code,slug,name,parameters,configuration,presentation,media,resources,status,publication_state,published_at',
        filters: { series_code: normalizedSeriesCode }, sort: 'model_code', predicate: (record) => record.series_code === normalizedSeriesCode,
        sanitize: sanitizeModelRecord
      });
      const parameterResult = await listPublishedParameters();
      return { ...result, data: mergePublishedParameters(result.data, parameterResult.data) };
    },
    async getModel(slug) {
      const normalizedSlug = validProductSlug(slug);
      const snapshot = await snapshotProducts();
      if (snapshot) return { data: snapshot.snapshot ? snapshot.models.find((record) => record.slug === normalizedSlug) ?? null : null, cache: snapshot.cache, source: snapshot.source };
      const result = await list({
        cacheKey: `model:${normalizedSlug}`, endpoint: modelsEndpoint,
        fields: 'id,series_code,model_code,slug,name,parameters,configuration,presentation,media,resources,case_studies,status,publication_state,published_at',
        filters: { slug: normalizedSlug }, predicate: (record) => record.slug === normalizedSlug, limit: 1, sanitize: sanitizeModelRecord
      });
      const parameterResult = await listPublishedParameters();
      return { data: mergePublishedParameters(result.data, parameterResult.data)[0] ?? null, cache: result.cache, source: result.source };
    }
  };
}
import { collectMediaAssetIds, createCmsMediaAssetResolver } from './cms-media-asset-resolver.mjs';
