const blockedPathParts = new Set(['__proto__', 'prototype', 'constructor']);
const alignments = new Set(['left', 'center', 'right']);
const productFeatureFieldPattern = /^configuration\.features\.(\d{1,2})\.(label|detail|note)$/;
const productIntroFieldPattern = /^configuration\.intro\.(title|subtitle|scene|body)$/;

function pathParts(fieldPath) {
  const parts = String(fieldPath || '').trim().split('.').filter(Boolean);
  if (!parts.length || parts.length > 12) return null;
  if (parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part) || blockedPathParts.has(part))) return null;
  return parts;
}

function productPresentationContainer(target, fieldPath) {
  const feature = String(fieldPath || '').trim().match(productFeatureFieldPattern);
  const intro = String(fieldPath || '').trim().match(productIntroFieldPattern);
  const configuration = target?.configuration;
  if (!feature && !intro) return undefined;
  if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) return null;
  const source = feature ? configuration.features?.[Number(feature[1])] : configuration.intro;
  const field = feature ? feature[2] : intro[1];
  if (!source || typeof source !== 'object' || Array.isArray(source) || !Object.hasOwn(source, field)) return null;
  if (configuration.field_presentation != null && (typeof configuration.field_presentation !== 'object' || Array.isArray(configuration.field_presentation))) return null;
  configuration.field_presentation ||= {};
  const key = feature ? `features_${feature[1]}_${field}` : `intro_${field}`;
  if (configuration.field_presentation[key] != null && (typeof configuration.field_presentation[key] !== 'object' || Array.isArray(configuration.field_presentation[key]))) return null;
  configuration.field_presentation[key] ||= {};
  return configuration.field_presentation[key];
}

function parentFor(target, fieldPath) {
  const productPresentation = productPresentationContainer(target, fieldPath);
  if (productPresentation !== undefined) return productPresentation;
  const parts = pathParts(fieldPath);
  if (!target || typeof target !== 'object' || !parts) return null;
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    if (cursor == null || typeof cursor !== 'object' || !Object.hasOwn(cursor, part)) return null;
    cursor = cursor[part];
  }
  return cursor && typeof cursor === 'object' ? cursor : null;
}

export function setVisualAlignment(target, fieldPath, mode) {
  const parent = parentFor(target, fieldPath);
  if (!parent || !alignments.has(String(mode))) return false;
  if (parent.layout != null && (typeof parent.layout !== 'object' || Array.isArray(parent.layout))) return false;
  parent.layout = { ...(parent.layout || {}), enabled: true, align_x: String(mode) };
  return true;
}
