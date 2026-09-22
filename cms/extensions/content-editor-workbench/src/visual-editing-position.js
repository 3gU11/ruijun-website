const blockedPathParts = new Set(['__proto__', 'prototype', 'constructor']);
const POSITION_LIMIT = 30;
const productFeatureFieldPattern = /^configuration\.features\.(\d{1,2})\.(label|detail|note|image)$/;
const productIntroFieldPattern = /^configuration\.intro\.(title|subtitle|scene|body)$/;
const productPresentationFieldPattern = /^presentation\.field_presentation\.(name|positioning|model_code)$/;
import { productParameterPresentationContainer } from './product-parameter-presentation.js';

function pathParts(fieldPath) {
  const parts = String(fieldPath || '').trim().split('.').filter(Boolean);
  if (!parts.length || parts.length > 12) return null;
  if (parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part) || blockedPathParts.has(part))) return null;
  return parts;
}

function productFeaturePresentationContainer(target, fieldPath, create) {
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
  if (!configuration.field_presentation) {
    if (!create) return null;
    configuration.field_presentation = {};
  }
  const key = `features_${index}_${field}`;
  if (configuration.field_presentation[key] != null && (typeof configuration.field_presentation[key] !== 'object' || Array.isArray(configuration.field_presentation[key]))) return null;
  if (!configuration.field_presentation[key]) {
    if (!create) return null;
    configuration.field_presentation[key] = {};
  }
  return configuration.field_presentation[key];
}

function productIntroPresentationContainer(target, fieldPath, create) {
  const match = String(fieldPath || '').trim().match(productIntroFieldPattern);
  if (!match) return undefined;
  const configuration = target?.configuration;
  const field = match[1];
  if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)
    || !configuration.intro || typeof configuration.intro !== 'object' || Array.isArray(configuration.intro)
    || !Object.hasOwn(configuration.intro, field)) return null;
  if (configuration.field_presentation != null && (typeof configuration.field_presentation !== 'object' || Array.isArray(configuration.field_presentation))) return null;
  if (!configuration.field_presentation) {
    if (!create) return null;
    configuration.field_presentation = {};
  }
  const key = `intro_${field}`;
  if (configuration.field_presentation[key] != null && (typeof configuration.field_presentation[key] !== 'object' || Array.isArray(configuration.field_presentation[key]))) return null;
  if (!configuration.field_presentation[key]) {
    if (!create) return null;
    configuration.field_presentation[key] = {};
  }
  return configuration.field_presentation[key];
}

function fieldPresentationContainer(target, fieldPath, create) {
  const itemField = String(fieldPath || '').trim().match(/^items\.(\d+)\.field_presentation\.([A-Za-z_][A-Za-z0-9_]*)$/);
  if (itemField) {
    const item = Array.isArray(target?.items) && Object.hasOwn(target.items, itemField[1]) ? target.items[itemField[1]] : null;
    if (!item || typeof item !== 'object' || Array.isArray(item) || blockedPathParts.has(itemField[2])) return null;
    return fieldPresentationContainer(item, `field_presentation.${itemField[2]}`, create);
  }
  const productFeature = productFeaturePresentationContainer(target, fieldPath, create);
  if (productFeature !== undefined) return productFeature;
  const productIntro = productIntroPresentationContainer(target, fieldPath, create);
  if (productIntro !== undefined) return productIntro;
  const productParameter = productParameterPresentationContainer(target, fieldPath, create);
  if (productParameter !== undefined) return productParameter;
  const presentationMatch = String(fieldPath || '').trim().match(productPresentationFieldPattern);
  if (presentationMatch) {
    if (!target || typeof target !== 'object' || !Object.hasOwn(target, presentationMatch[1])) return null;
    if (target.presentation != null && (typeof target.presentation !== 'object' || Array.isArray(target.presentation))) return null;
    if (!target.presentation) {
      if (!create) return null;
      target.presentation = {};
    }
    if (target.presentation.field_presentation != null && (typeof target.presentation.field_presentation !== 'object' || Array.isArray(target.presentation.field_presentation))) return null;
    if (!target.presentation.field_presentation) {
      if (!create) return null;
      target.presentation.field_presentation = {};
    }
    const key = presentationMatch[1];
    if (target.presentation.field_presentation[key] != null && (typeof target.presentation.field_presentation[key] !== 'object' || Array.isArray(target.presentation.field_presentation[key]))) return null;
    if (!target.presentation.field_presentation[key]) {
      if (!create) return null;
      target.presentation.field_presentation[key] = {};
    }
    return target.presentation.field_presentation[key];
  }
  if (String(fieldPath || '').trim().startsWith('configuration.features.')) return null;
  const match = String(fieldPath || '').trim().match(/^field_presentation\.([A-Za-z_][A-Za-z0-9_]*)$/);
  if (!match || !target || typeof target !== 'object') return undefined;
  const mediaSlot = match[1] === 'image' ? target.media_role : match[1] === 'map' ? target.map_media_role : '';
  if (!Object.hasOwn(target, match[1]) && !(typeof mediaSlot === 'string' && mediaSlot.trim())) return null;
  const key = match[1];
  if (target.field_presentation != null && (typeof target.field_presentation !== 'object' || Array.isArray(target.field_presentation))) return null;
  if (!target.field_presentation) {
    if (!create) return null;
    target.field_presentation = {};
  }
  if (target.field_presentation[key] != null && (typeof target.field_presentation[key] !== 'object' || Array.isArray(target.field_presentation[key]))) return null;
  if (!target.field_presentation[key]) {
    if (!create) return null;
    target.field_presentation[key] = {};
  }
  return target.field_presentation[key];
}

function positionContainer(target, fieldPath, create = false) {
  if (!target || typeof target !== 'object') return null;
  const fieldPresentation = fieldPresentationContainer(target, fieldPath, create);
  if (fieldPresentation !== undefined) return fieldPresentation;
  const parts = pathParts(fieldPath);
  if (!parts) return null;
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    if (cursor == null || typeof cursor !== 'object' || !Object.hasOwn(cursor, part)) return null;
    cursor = cursor[part];
  }
  if (cursor == null || typeof cursor !== 'object') return null;
  const last = parts.at(-1);
  if (Array.isArray(cursor)) {
    if (!/^\d+$/.test(last) || !Object.hasOwn(cursor, last)) return null;
    cursor = cursor[last];
  } else if (!Object.hasOwn(cursor, last)) {
    return null;
  }
  return cursor && typeof cursor === 'object' && !Array.isArray(cursor) ? cursor : null;
}

function bounded(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(-POSITION_LIMIT, Math.min(POSITION_LIMIT, number)) : fallback;
}

function desktopLayout(container, create) {
  if (!container || typeof container !== 'object') return null;
  const layout = container.layout;
  if (layout != null && (typeof layout !== 'object' || Array.isArray(layout))) return null;
  if (!layout && !create) return null;
  const safeLayout = layout || (container.layout = {});
  const desktop = safeLayout.desktop;
  if (desktop != null && (typeof desktop !== 'object' || Array.isArray(desktop))) return null;
  if (!desktop && !create) return null;
  return desktop || (safeLayout.desktop = {});
}

export function readVisualPosition(target, fieldPath) {
  const container = positionContainer(target, fieldPath, false);
  const desktop = desktopLayout(container, false);
  return { x: bounded(desktop?.offset_x), y: bounded(desktop?.offset_y) };
}

export function applyVisualPositionDelta(target, fieldPath, delta = {}) {
  const container = positionContainer(target, fieldPath, true);
  const desktop = desktopLayout(container, true);
  const x = Number(delta?.x);
  const y = Number(delta?.y);
  if (!desktop || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  desktopLayout(container, true);
  container.layout.enabled = true;
  desktop.offset_x = bounded((Number.isFinite(Number(desktop.offset_x)) ? Number(desktop.offset_x) : 0) + x);
  desktop.offset_y = bounded((Number.isFinite(Number(desktop.offset_y)) ? Number(desktop.offset_y) : 0) + y);
  return { x: desktop.offset_x, y: desktop.offset_y };
}

export function setVisualPosition(target, fieldPath, position = {}) {
  const container = positionContainer(target, fieldPath, true);
  const desktop = desktopLayout(container, true);
  const x = Number(position?.x);
  const y = Number(position?.y);
  if (!desktop || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  container.layout.enabled = true;
  desktop.offset_x = bounded(x);
  desktop.offset_y = bounded(y);
  return { x: desktop.offset_x, y: desktop.offset_y };
}
