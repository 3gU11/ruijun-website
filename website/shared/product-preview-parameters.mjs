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

export function groupPreviewProductParameters(records, modelCode) {
  const selectedCode = String(modelCode || '').trim();
  if (!selectedCode || !Array.isArray(records)) return [];
  const groups = new Map();
  const rows = records.flatMap((record) => {
    const id = safeId(record?.id);
    const label = String(record?.field_name || '').trim();
    const rawValue = String(record?.value ?? '').trim();
    if (!id || String(record?.model_code || '').trim() !== selectedCode || !label || !rawValue) return [];
    const unit = String(record?.unit || '').trim();
    return [{ id, label, value: rawValue, unit, presentation: safePresentation(record?.presentation), group: String(record?.group_name || '').trim(), sort: Number(record?.sort_order) || 0 }];
  }).sort((left, right) => left.sort - right.sort || left.id.localeCompare(right.id));
  for (const row of rows) {
    if (!groups.has(row.group)) groups.set(row.group, []);
    groups.get(row.group).push({ id: row.id, label: row.label, value: row.value, unit: row.unit, ...(row.presentation ? { presentation: row.presentation } : {}) });
  }
  return [...groups.entries()].map(([name, items]) => ({
    name,
    // group_name is denormalized across the contained parameter rows. The
    // canvas must carry every row id so a rename cannot split one group.
    groupBinding: { collection: 'product_parameters', itemId: items[0].id, recordIds: items.map((item) => item.id) },
    items
  }));
}

export function normalizePreviewParameterGroups(groups) {
  if (!Array.isArray(groups)) return [];
  return groups.flatMap((group) => {
    const name = String(group?.name || '').trim();
    const items = Array.isArray(group?.items) ? group.items.flatMap((item) => {
      const id = safeId(item?.id);
      const label = String(item?.label || item?.key || '').trim();
      const value = String(item?.value ?? '').trim();
      const unit = String(item?.unit || '').trim();
      const presentation = safePresentation(item?.presentation);
      return id && label && value ? [{ id, label, value, unit, ...(presentation ? { presentation } : {}) }] : [];
    }) : [];
    return items.length ? [{ name, items }] : [];
  });
}
