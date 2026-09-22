const blockedPathParts = new Set(['__proto__', 'prototype', 'constructor']);
const allowedWeights = new Set([300, 400, 500, 600, 700, 800]);
const productFeatureFieldPattern = /^configuration\.features\.(\d{1,2})\.(label|detail|note)$/;
const productIntroFieldPattern = /^configuration\.intro\.(title|subtitle|scene|body)$/;
const productPresentationFieldPattern = /^presentation\.field_presentation\.(name|positioning|model_code)$/;
const sectionContentPresentationFieldPattern = /^field_presentation\.content_([A-Za-z_][A-Za-z0-9_]*)$/;
import { productParameterPresentationContainer } from './product-parameter-presentation.js';

function pathParts(fieldPath) {
  const parts = String(fieldPath || '').trim().split('.').filter(Boolean);
  if (!parts.length || parts.length > 12) return null;
  if (parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part) || blockedPathParts.has(part))) return null;
  return parts;
}

function productFeaturePresentationContainer(target, fieldPath) {
  const match = String(fieldPath || '').trim().match(productFeatureFieldPattern);
  if (!match) return undefined;
  const configuration = target?.configuration;
  const index = Number(match[1]);
  const field = match[2];
  if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)
    || !Array.isArray(configuration.features) || !Object.hasOwn(configuration.features, index)) return null;
  const feature = configuration.features[index];
  if (!feature || typeof feature !== 'object' || Array.isArray(feature) || !Object.hasOwn(feature, field)) return null;
  if (configuration.field_presentation != null && (typeof configuration.field_presentation !== 'object' || Array.isArray(configuration.field_presentation))) return null;
  configuration.field_presentation ||= {};
  const key = `features_${index}_${field}`;
  if (configuration.field_presentation[key] != null && (typeof configuration.field_presentation[key] !== 'object' || Array.isArray(configuration.field_presentation[key]))) return null;
  configuration.field_presentation[key] ||= {};
  return configuration.field_presentation[key];
}

function productIntroPresentationContainer(target, fieldPath) {
  const match = String(fieldPath || '').trim().match(productIntroFieldPattern);
  if (!match) return undefined;
  const configuration = target?.configuration;
  const field = match[1];
  if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)
    || !configuration.intro || typeof configuration.intro !== 'object' || Array.isArray(configuration.intro)
    || !Object.hasOwn(configuration.intro, field)) return null;
  if (configuration.field_presentation != null && (typeof configuration.field_presentation !== 'object' || Array.isArray(configuration.field_presentation))) return null;
  configuration.field_presentation ||= {};
  const key = `intro_${field}`;
  if (configuration.field_presentation[key] != null && (typeof configuration.field_presentation[key] !== 'object' || Array.isArray(configuration.field_presentation[key]))) return null;
  configuration.field_presentation[key] ||= {};
  return configuration.field_presentation[key];
}

function fieldPresentationContainer(target, fieldPath) {
  const productFeature = productFeaturePresentationContainer(target, fieldPath);
  if (productFeature !== undefined) return productFeature;
  const productIntro = productIntroPresentationContainer(target, fieldPath);
  if (productIntro !== undefined) return productIntro;
  const productParameter = productParameterPresentationContainer(target, fieldPath, true);
  if (productParameter !== undefined) return productParameter;
  const presentationMatch = String(fieldPath || '').trim().match(productPresentationFieldPattern);
  if (presentationMatch) {
    if (!target || typeof target !== 'object' || !Object.hasOwn(target, presentationMatch[1])) return null;
    if (target.presentation != null && (typeof target.presentation !== 'object' || Array.isArray(target.presentation))) return null;
    target.presentation ||= {};
    if (target.presentation.field_presentation != null && (typeof target.presentation.field_presentation !== 'object' || Array.isArray(target.presentation.field_presentation))) return null;
    target.presentation.field_presentation ||= {};
    const key = presentationMatch[1];
    if (target.presentation.field_presentation[key] != null && (typeof target.presentation.field_presentation[key] !== 'object' || Array.isArray(target.presentation.field_presentation[key]))) return null;
    target.presentation.field_presentation[key] ||= {};
    return target.presentation.field_presentation[key];
  }
  const contentMatch = String(fieldPath || '').trim().match(sectionContentPresentationFieldPattern);
  if (contentMatch) {
    const field = contentMatch[1];
    if (!target || typeof target !== 'object' || !target.content || typeof target.content !== 'object' || Array.isArray(target.content) || !Object.hasOwn(target.content, field)) return null;
    if (target.field_presentation != null && (typeof target.field_presentation !== 'object' || Array.isArray(target.field_presentation))) return null;
    target.field_presentation ||= {};
    const key = `content_${field}`;
    if (target.field_presentation[key] != null && (typeof target.field_presentation[key] !== 'object' || Array.isArray(target.field_presentation[key]))) return null;
    target.field_presentation[key] ||= {};
    return target.field_presentation[key];
  }
  if (String(fieldPath || '').trim().startsWith('configuration.features.')) return null;
  const match = String(fieldPath || '').trim().match(/^field_presentation\.([A-Za-z_][A-Za-z0-9_]*)$/);
  if (!match || !target || typeof target !== 'object' || !Object.hasOwn(target, match[1])) return undefined;
  const key = match[1];
  if (target.field_presentation != null && (typeof target.field_presentation !== 'object' || Array.isArray(target.field_presentation))) return null;
  target.field_presentation ||= {};
  if (target.field_presentation[key] != null && (typeof target.field_presentation[key] !== 'object' || Array.isArray(target.field_presentation[key]))) return null;
  target.field_presentation[key] ||= {};
  return target.field_presentation[key];
}

function parentFor(target, fieldPath) {
  const fieldPresentation = fieldPresentationContainer(target, fieldPath);
  if (fieldPresentation !== undefined) return fieldPresentation;
  const parts = pathParts(fieldPath);
  if (!target || typeof target !== 'object' || !parts) return null;
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    if (cursor == null || typeof cursor !== 'object' || !Object.hasOwn(cursor, part)) return null;
    cursor = cursor[part];
  }
  return cursor && typeof cursor === 'object' ? cursor : null;
}

function boundedSize(value) {
  const size = Number(value);
  return Number.isFinite(size) ? Math.max(0, Math.min(120, size)) : null;
}

function boundedLineHeight(value) {
  const lineHeight = Number(value);
  return Number.isFinite(lineHeight) && lineHeight >= 1 && lineHeight <= 2.2 ? lineHeight : null;
}

function hexColor(value) {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : '';
}

export function setVisualTextStyle(target, fieldPath, style = {}) {
  const parent = parentFor(target, fieldPath);
  if (!parent) return false;
  const fontSize = boundedSize(style.fontSize);
  const numericWeight = Number(style.fontWeight);
  const fontWeight = allowedWeights.has(numericWeight) ? numericWeight : Math.max(300, Math.min(800, Number.isFinite(numericWeight) ? numericWeight : 400));
  const lineHeight = boundedLineHeight(style.lineHeight);
  const color = hexColor(style.textColor);
  if (fontSize == null || !Number.isFinite(fontWeight)) return false;
  const current = parent.text_style;
  if (current != null && (typeof current !== 'object' || Array.isArray(current))) return false;
  parent.text_style = {
    ...(current || {}),
    enabled: true,
    weight: Math.round(fontWeight),
    size_desktop: fontSize,
    ...(lineHeight != null ? { line_height: lineHeight } : {}),
    ...(color ? { color } : {})
  };
  return true;
}
