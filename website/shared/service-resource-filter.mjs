function normalizeModelCode(value) {
  return typeof value === 'string' ? value.normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
}

export function filterServiceResources(resources, modelQuery) {
  const query = normalizeModelCode(modelQuery);
  if (!Array.isArray(resources)) return [];
  return resources.filter((resource) => {
    if (!resource || typeof resource !== 'object' || !Array.isArray(resource.applicable_models)) return false;
    if (!query) return true;
    return resource.applicable_models.some((model) => normalizeModelCode(model) === query);
  });
}
