const choices = Object.freeze({
  template: new Set(['default', 'overlay-left', 'overlay-center', 'overlay-right', 'split-media-left', 'split-media-right', 'stack', 'grid', 'gallery', 'timeline', 'process']),
  mobileTemplate: new Set(['inherit', 'stack', 'grid', 'gallery', 'timeline', 'process']),
  alignX: new Set(['left', 'center', 'right']),
  alignY: new Set(['top', 'center', 'bottom']),
  width: new Set(['narrow', 'normal', 'wide', 'full']),
  gap: new Set(['none', 'small', 'medium', 'large']),
  preset: new Set(['inherit', 'hero', 'section-title', 'body', 'data', 'card-title', 'caption', 'button']),
  fit: new Set(['cover', 'contain']),
  overlay: new Set(['none', 'dark-15', 'dark-30', 'dark-50', 'light-15'])
});

function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function pick(value, allowed, fallback) { return typeof value === 'string' && allowed.has(value) ? value : fallback; }
function number(value, minimum, maximum, fallback) { const parsed = Number(value); return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback; }
function integer(value, minimum, maximum, fallback) { const parsed = Number(value); return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback; }

export function hasSectionPresentation(value) {
  const source = object(value);
  return ['layout', 'text_style', 'responsive', 'media_presentation'].some((field) => Object.hasOwn(source, field));
}

export function normalizeSectionPresentation(value) {
  const source = object(value); const layout = object(source.layout); const desktop = object(layout.desktop); const mobile = object(layout.mobile); const text = object(source.text_style); const responsive = object(source.responsive); const media = object(source.media_presentation);
  const color = typeof text.color === 'string' && /^#[0-9a-f]{6}$/i.test(text.color.trim()) ? text.color.trim().toUpperCase() : '';
  return {
    layout: { enabled: layout.enabled === true, template: pick(layout.template, choices.template, 'default'), align_x: pick(layout.align_x, choices.alignX, 'left'), align_y: pick(layout.align_y, choices.alignY, 'top'), width: pick(layout.width, choices.width, 'normal'), gap: pick(layout.gap, choices.gap, 'medium'), order: integer(layout.order, 0, 999, 0), z_index: integer(layout.z_index, 0, 9, 0), desktop: { offset_x: number(desktop.offset_x, -30, 30, 0), offset_y: number(desktop.offset_y, -30, 30, 0) }, mobile: { offset_x: number(mobile.offset_x, -30, 30, 0), offset_y: number(mobile.offset_y, -30, 30, 0) } },
    text_style: { enabled: text.enabled === true, preset: pick(text.preset, choices.preset, 'inherit'), weight: integer(text.weight, 300, 800, 400), size_desktop: number(text.size_desktop, 12, 120, 0), size_mobile: number(text.size_mobile, 12, 72, 0), line_height: number(text.line_height, 1, 2.2, 1.4), color, max_width: pick(text.max_width, choices.width, 'normal') },
    responsive: { enabled: responsive.enabled === true, desktop_visible: responsive.desktop_visible !== false, tablet_visible: responsive.tablet_visible !== false, mobile_visible: responsive.mobile_visible !== false, mobile_template: pick(responsive.mobile_template, choices.mobileTemplate, 'inherit') },
    media_presentation: { enabled: media.enabled === true, fit: pick(media.fit, choices.fit, 'cover'), focal_x: number(media.focal_x, 0, 100, 50), focal_y: number(media.focal_y, 0, 100, 50), overlay: pick(media.overlay, choices.overlay, 'none'), poster_asset_id: typeof media.poster_asset_id === 'string' || Number.isSafeInteger(media.poster_asset_id) ? String(media.poster_asset_id).trim().slice(0, 120) : '' }
  };
}

export function normalizeFieldPresentations(value, allowedFields = []) {
  const source = object(value);
  const permitted = new Set(Array.isArray(allowedFields) ? allowedFields : []);
  return Object.fromEntries(Object.entries(source).slice(0, 32).flatMap(([field, presentation]) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(field) || ['__proto__', 'prototype', 'constructor'].includes(field) || (permitted.size && !permitted.has(field))) return [];
    if (!presentation || typeof presentation !== 'object' || Array.isArray(presentation)) return [];
    return [[field, normalizeSectionPresentation(presentation)]];
  }));
}
