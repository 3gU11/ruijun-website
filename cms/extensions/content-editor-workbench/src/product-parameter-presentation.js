const parameterFields = new Set(['field_name', 'value', 'unit']);

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

// Product parameters are independent records, so their visual settings must
// live on the record instead of leaking into a product-model configuration.
export function productParameterPresentationContainer(target, fieldPath, create = false) {
  const field = String(fieldPath || '').trim();
  if (!object(target) || !String(target.model_code || '').trim()
    || !Object.hasOwn(target, 'field_name') || !Object.hasOwn(target, 'value')) return undefined;
  // Once a record is identified as an independent parameter, it can only
  // persist presentation for the three rendered cells.
  if (!parameterFields.has(field)) return null;
  if (target.presentation != null && !object(target.presentation)) return null;
  if (!target.presentation) {
    if (!create) return null;
    target.presentation = {};
  }
  if (target.presentation.field_presentation != null && !object(target.presentation.field_presentation)) return null;
  if (!target.presentation.field_presentation) {
    if (!create) return null;
    target.presentation.field_presentation = {};
  }
  const fields = target.presentation.field_presentation;
  if (fields[field] != null && !object(fields[field])) return null;
  if (!fields[field]) {
    if (!create) return null;
    fields[field] = {};
  }
  return fields[field];
}
