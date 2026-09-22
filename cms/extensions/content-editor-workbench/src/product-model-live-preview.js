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

export function productModelLivePreviewRecord(record, parameterRecords) {
  const model = { ...(record || {}) };
  const modelCode = text(model.model_code);
  const groups = new Map();
  const rows = (Array.isArray(parameterRecords) ? parameterRecords : [])
    .flatMap((parameter) => {
      const id = safeId(parameter?.id);
      const label = text(parameter?.field_name);
      const value = text(parameter?.value);
      if (!id || !modelCode || text(parameter?.model_code) !== modelCode || !label || !value) return [];
      return [{ id, label, value, unit: text(parameter.unit), presentation: safePresentation(parameter.presentation), name: text(parameter.group_name), sort: Number(parameter.sort_order) || 0 }];
    })
    .sort((left, right) => left.sort - right.sort || left.id.localeCompare(right.id));
  for (const row of rows) {
    if (!groups.has(row.name)) groups.set(row.name, []);
    groups.get(row.name).push({ id: row.id, label: row.label, value: row.value, unit: row.unit, ...(row.presentation ? { presentation: row.presentation } : {}) });
  }
  model.parameter_groups = [...groups.entries()].map(([name, items]) => ({
    name,
    groupBinding: { collection: 'product_parameters', itemId: items[0].id, recordIds: items.map((item) => item.id) },
    items
  }));
  return model;
}
