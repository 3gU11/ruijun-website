function modelCode(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function displayValue(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

export function toggleComparedModel(selected, code, maximum = 3) {
  const normalizedCode = modelCode(code);
  const current = [...new Set((Array.isArray(selected) ? selected : []).map(modelCode).filter(Boolean))];
  if (!normalizedCode) return current;
  if (current.includes(normalizedCode)) return current.filter((item) => item !== normalizedCode);
  return current.length >= maximum ? current : [...current, normalizedCode];
}

export function buildComparisonRows(models, labels) {
  const selectedModels = (Array.isArray(models) ? models : []).filter((model) => model && typeof model === 'object');
  return Object.entries(labels || {})
    .map(([key, label]) => {
      const values = selectedModels.map((model) => displayValue(model.parameters && typeof model.parameters === 'object' ? model.parameters[key] : undefined));
      return { key, label, values };
    })
    .filter((row) => typeof row.label === 'string' && row.label && row.values.some(Boolean));
}
