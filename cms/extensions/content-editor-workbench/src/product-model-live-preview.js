function text(value) {
  return String(value ?? '').trim();
}

function safeId(value) {
  const id = text(value);
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id) ? id : '';
}

function safePresentation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value.field_presentation;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return undefined;
  const fields = Object.fromEntries(['field_name', 'value', 'unit'].flatMap((field) => {
    const presentation = source[field];
    return presentation && typeof presentation === 'object' && !Array.isArray(presentation)
      ? [[field, presentation]]
      : [];
  }));
  return Object.keys(fields).length ? { field_presentation: fields } : undefined;
}

// `product_parameters` has no group field any more: the preview keeps one
// anonymous container so the page can bind every cell to its own record.
export function productModelLivePreviewRecord(record, parameterRecords) {
  const model = { ...(record || {}) };
  const modelCode = text(model.model_code);
  const items = (Array.isArray(parameterRecords) ? parameterRecords : [])
    .flatMap((parameter) => {
      const id = safeId(parameter?.id);
      const label = text(parameter?.field_name);
      const value = text(parameter?.value);
      if (!id || !modelCode || text(parameter?.model_code) !== modelCode || !label || !value) return [];
      return [{ id, label, value, unit: text(parameter.unit), presentation: safePresentation(parameter.presentation), sort: Number(parameter.sort_order) || 0 }];
    })
    .sort((left, right) => left.sort - right.sort || left.id.localeCompare(right.id))
    .map(({ id, label, value, unit, presentation }) => ({
      id, label, value, unit, ...(presentation ? { presentation } : {})
    }));
  model.parameter_groups = items.length ? [{ name: '', items }] : [];
  return model;
}
