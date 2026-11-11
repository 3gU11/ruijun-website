function safeId(value) {
  const id = String(value ?? '').trim();
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

// `product_parameters` no longer stores a group name. The page still consumes a
// single-row-set container so every cell keeps its record id and presentation,
// but that container is always anonymous and never renders a section title.
export function groupPreviewProductParameters(records, modelCode) {
  const selectedCode = String(modelCode || '').trim();
  if (!selectedCode || !Array.isArray(records)) return [];
  const items = records.flatMap((record) => {
    const id = safeId(record?.id);
    const label = String(record?.field_name || '').trim();
    const rawValue = String(record?.value ?? '').trim();
    if (!id || String(record?.model_code || '').trim() !== selectedCode || !label || !rawValue) return [];
    return [{
      id,
      label,
      value: rawValue,
      unit: String(record?.unit || '').trim(),
      presentation: safePresentation(record?.presentation),
      sort: Number(record?.sort_order) || 0
    }];
  }).sort((left, right) => left.sort - right.sort || left.id.localeCompare(right.id));
  if (!items.length) return [];
  return [{
    name: '',
    items: items.map(({ id, label, value, unit, presentation }) => ({
      id, label, value, unit, ...(presentation ? { presentation } : {})
    }))
  }];
}

export function mergePreviewParameterRows(publishedItems, previewItems) {
  const rows = (Array.isArray(publishedItems) ? publishedItems : []).map((item) => ({ ...item }));
  const indexByLabel = new Map();
  rows.forEach((row, index) => {
    const label = String(row?.label || '').trim();
    if (label) indexByLabel.set(label, index);
  });
  for (const item of Array.isArray(previewItems) ? previewItems : []) {
    const label = String(item?.label || '').trim();
    const index = label ? indexByLabel.get(label) : undefined;
    if (index === undefined) {
      rows.push({ ...item });
      if (label) indexByLabel.set(label, rows.length - 1);
      continue;
    }
    rows[index] = { ...rows[index], ...item };
  }
  return rows;
}

export function normalizePreviewParameterGroups(groups) {
  if (!Array.isArray(groups)) return [];
  return groups.flatMap((group) => {
    const name = String(group?.name || '').trim();
    const items = Array.isArray(group?.items) ? group.items.flatMap((item) => {
      // Published BFF rows are denormalized without a record id: they are
      // read-only on the public page. Preview rows keep their ids so the canvas
      // can still bind every cell. An *invalid* id is still rejected instead of
      // silently becoming an unbound row.
      const rawId = item?.id;
      const missingId = rawId === undefined || rawId === null || String(rawId).trim() === '';
      const id = missingId ? '' : safeId(rawId);
      if (!missingId && !id) return [];
      const label = String(item?.label || item?.key || '').trim();
      const value = String(item?.value ?? '').trim();
      const unit = String(item?.unit || '').trim();
      const presentation = safePresentation(item?.presentation);
      return label && value ? [{ ...(id ? { id } : {}), label, value, unit, ...(presentation ? { presentation } : {}) }] : [];
    }) : [];
    return items.length ? [{ name, items }] : [];
  });
}
