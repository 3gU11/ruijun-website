const productFeatureFieldPath = /^configuration\.features\.\d{1,2}\.(?:label|detail|note|image)$/;
const productIntroFieldPath = /^configuration\.intro\.(?:title|subtitle|scene|body)$/;

// Product feature presentations are keyed by their visible content path, while
// the DOM exposes the persisted JSON location for diagnostics. Editing helpers
// intentionally accept the content path so they can create the allowlisted key.
export function visualPresentationFieldPath(selection = {}) {
  const collection = String(selection.collection || '').trim();
  const fieldPath = String(selection.fieldPath || '').trim();
  const positionFieldPath = String(selection.positionFieldPath || '').trim();
  if (collection === 'product_models' && (productFeatureFieldPath.test(fieldPath) || productIntroFieldPath.test(fieldPath))) return fieldPath;
  return positionFieldPath || fieldPath;
}
