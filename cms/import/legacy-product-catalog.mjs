const DRAFT = Object.freeze({ status: 'draft', publication_state: 'unpublished' });
const CATALOG_SOURCE = 'demo/data/product-catalog.json';

const PARAMETER_DEFINITIONS = Object.freeze({
  xyTravelMm: Object.freeze({ group_name: '运动参数', field_name: 'XY 行程', unit: 'mm' }),
  zAxisTravelMm: Object.freeze({ group_name: '运动参数', field_name: 'Z 轴行程', unit: 'mm' }),
  maxWorkpieceMm: Object.freeze({ group_name: '工作范围', field_name: '最大工件尺寸', unit: 'mm' }),
  maxWorkpieceWeightKg: Object.freeze({ group_name: '工作范围', field_name: '最大工件重量', unit: 'kg' }),
  maxCuttingHeightMm: Object.freeze({ group_name: '工作范围', field_name: '最大切割厚度', unit: 'mm' }),
  maxTaperDegrees: Object.freeze({ group_name: '切割能力', field_name: '最大锥度', unit: '°' }),
  machineDimensionsMm: Object.freeze({ group_name: '设备尺寸', field_name: '机床外形尺寸', unit: 'mm' }),
  machineWeightKg: Object.freeze({ group_name: '设备尺寸', field_name: '机床重量', unit: 'kg' })
});

function seriesReviewNote(series) {
  const aliases = series.aliasesPendingReview?.length
    ? `，存在待审核别名：${series.aliasesPendingReview.join('、')}`
    : '';
  return `已从旧官网资料导入草稿，尚未完成产品及技术审核${aliases}。不得公开发布。`;
}

function modelReviewNote(model) {
  const notes = [];
  if (model.seriesMappingStatus) notes.push('系列归属待产品负责人确认');
  if (model.detailPageEvidence?.conflictsWithTechnicalPackage?.length) notes.push('详情页与技术文件参数存在冲突');
  const reviewScope = notes.length ? `；${notes.join('；')}` : '';
  return `已从旧官网资料导入草稿，尚未完成技术审核${reviewScope}。不得公开发布。`;
}

function sourceUrlFor(model, seriesByCode) {
  return model.sourceUrl
    ?? model.detailPageEvidence?.sourceUrl
    ?? seriesByCode.get(model.seriesCode)?.sourceUrl
    ?? null;
}

function parameterValue(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function parameterReviewNote(model, key) {
  const conflicts = model.detailPageEvidence?.conflictsWithTechnicalPackage ?? [];
  const conflictNote = conflicts.includes(key)
    ? `；详情页与技术文件对该参数存在冲突（${key}），需由技术审核人确认`
    : '';
  return `已从旧官网资料导入产品参数草稿，尚未完成技术审核${conflictNote}。不得公开发布。`;
}

function buildProductParameterDrafts(model, seriesByCode) {
  const parameters = model.parameters && typeof model.parameters === 'object' && !Array.isArray(model.parameters)
    ? model.parameters
    : {};
  const sourceDocument = model.sourceDocument ?? CATALOG_SOURCE;
  const sourceUrl = sourceUrlFor(model, seriesByCode);
  const observedParameters = model.detailPageEvidence?.observedParameters ?? {};
  return Object.entries(parameters).flatMap(([key, rawValue], index) => {
    const value = parameterValue(rawValue);
    if (!value) return [];
    const definition = PARAMETER_DEFINITIONS[key] ?? {
      group_name: '其他参数',
      field_name: key,
      unit: null
    };
    return [{
      ...DRAFT,
      model_code: model.code,
      group_name: definition.group_name,
      field_name: definition.field_name,
      value,
      unit: definition.unit,
      sort_order: index + 1,
      test_conditions: null,
      source_url: sourceUrl,
      source_document: sourceDocument,
      review_note: parameterReviewNote(model, key),
      import_evidence: {
        catalog_source: CATALOG_SOURCE,
        source_key: key,
        raw_value: rawValue,
        model_name: model.name ?? null,
        detail_page_observed_value: Object.hasOwn(observedParameters, key) ? observedParameters[key] : null,
        parameter_conflict: (model.detailPageEvidence?.conflictsWithTechnicalPackage ?? []).includes(key)
      }
    }];
  });
}

export function buildLegacyProductDraftImport(catalog) {
  if (!Array.isArray(catalog?.series) || !Array.isArray(catalog?.models)) {
    throw new TypeError('catalog must contain series and models arrays');
  }

  const seriesByCode = new Map(catalog.series.map((series) => [series.code, series]));
  const product_series = catalog.series.map((series, index) => ({
    ...DRAFT,
    series_code: series.code,
    slug: series.code,
    name: series.name,
    positioning: series.positioning ?? null,
    scenarios: series.applicationScenario ? [series.applicationScenario] : [],
    capabilities: series.capabilities ?? [],
    sort_order: index + 1,
    language: 'zh-CN',
    source_url: series.sourceUrl ?? null,
    source_document: CATALOG_SOURCE,
    review_note: seriesReviewNote(series),
    import_evidence: {
      aliases_pending_review: series.aliasesPendingReview ?? [],
      configuration_notes: series.configurationNotes ?? []
    }
  }));

  const product_models = catalog.models.map((model) => ({
    ...DRAFT,
    series_code: model.seriesCode,
    model_code: model.code,
    slug: model.code,
    name: model.name,
    parameters: model.parameters ?? {},
    configuration: { optional_model_evidence: model.optionalModelEvidence ?? [] },
    source_url: sourceUrlFor(model, seriesByCode),
    source_document: model.sourceDocument ?? CATALOG_SOURCE,
    review_note: modelReviewNote(model),
    import_evidence: {
      series_mapping_status: model.seriesMappingStatus ?? 'mapped_from_source',
      observed_model_names: model.observedModelNames ?? [],
      parameter_conflicts: model.detailPageEvidence?.conflictsWithTechnicalPackage ?? [],
      detail_page_observed_parameters: model.detailPageEvidence?.observedParameters ?? {},
      structured_parameter_keys: Object.keys(model.parameters ?? {}),
      catalog_source: CATALOG_SOURCE
    }
  }));

  const product_parameters = catalog.models.flatMap((model) => buildProductParameterDrafts(model, seriesByCode));

  return { product_series, product_models, product_parameters };
}

export { PARAMETER_DEFINITIONS };
