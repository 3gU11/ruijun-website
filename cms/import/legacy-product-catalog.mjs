const DRAFT = Object.freeze({ status: 'draft', publication_state: 'unpublished' });
const CATALOG_SOURCE = 'demo/data/product-catalog.json';

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
      catalog_source: CATALOG_SOURCE
    }
  }));

  return { product_series, product_models };
}
