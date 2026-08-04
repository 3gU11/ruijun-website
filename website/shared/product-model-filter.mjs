function text(value) {
  return typeof value === 'string' ? value.normalize('NFKC').trim() : '';
}

export function normalizeProductSearch(value) {
  return text(value).toUpperCase().replace(/[^A-Z0-9\u4E00-\u9FFF]+/g, '');
}

function isDisplayableModel(record) {
  return Boolean(record && typeof record === 'object' && text(record.model_code));
}

export function filterProductModels(records, query) {
  const models = Array.isArray(records) ? records.filter(isDisplayableModel) : [];
  const normalizedQuery = normalizeProductSearch(query);
  if (!normalizedQuery) return models;

  return models.filter((model) => [model.model_code, model.name, model.series_code]
    .some((value) => normalizeProductSearch(value).includes(normalizedQuery)));
}
