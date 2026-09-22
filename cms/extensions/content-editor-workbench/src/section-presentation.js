const TEMPLATE_VALUES = ['default', 'overlay-left', 'overlay-center', 'overlay-right', 'split-media-left', 'split-media-right', 'stack', 'grid', 'gallery', 'timeline', 'process'];
const MOBILE_TEMPLATE_VALUES = ['inherit', 'stack', 'grid', 'gallery', 'timeline', 'process'];
const HORIZONTAL_ALIGNMENTS = ['left', 'center', 'right'];
const VERTICAL_ALIGNMENTS = ['top', 'center', 'bottom'];
const WIDTH_VALUES = ['narrow', 'normal', 'wide', 'full'];
const GAP_VALUES = ['none', 'small', 'medium', 'large'];
const PRESET_VALUES = ['inherit', 'hero', 'section-title', 'body', 'data', 'card-title', 'caption', 'button'];
const FIT_VALUES = ['cover', 'contain'];
const OVERLAY_VALUES = ['none', 'dark-15', 'dark-30', 'dark-50', 'light-15'];

function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function pick(value, values, fallback) { return typeof value === 'string' && values.includes(value) ? value : fallback; }
function number(value, min, max, fallback) { const parsed = Number(value); return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback; }
function integer(value, min, max, fallback) { const parsed = Number(value); return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback; }
function color(value) { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim().toUpperCase() : ''; }

export function normalizeFieldPresentations(value, allowedFields = []) {
  const source = object(value);
  const permitted = new Set(Array.isArray(allowedFields) ? allowedFields : []);
  return Object.fromEntries(Object.entries(source).slice(0, 32).flatMap(([field, presentation]) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(field) || ['__proto__', 'prototype', 'constructor'].includes(field) || (permitted.size && !permitted.has(field))) return [];
    if (!presentation || typeof presentation !== 'object' || Array.isArray(presentation)) return [];
    return [[field, normalizeSectionPresentation(presentation)]];
  }));
}

export function defaultSectionPresentation() {
  return { layout: { enabled: false, template: 'default', align_x: 'left', align_y: 'top', width: 'normal', gap: 'medium', order: 0, z_index: 0, desktop: { offset_x: 0, offset_y: 0 }, mobile: { offset_x: 0, offset_y: 0 } }, text_style: { enabled: false, preset: 'inherit', weight: 400, size_desktop: 0, size_mobile: 0, line_height: 1.4, color: '', max_width: 'normal' }, responsive: { enabled: false, desktop_visible: true, tablet_visible: true, mobile_visible: true, mobile_template: 'inherit' }, media_presentation: { enabled: false, fit: 'cover', focal_x: 50, focal_y: 50, overlay: 'none', poster_asset_id: '' } };
}

export function normalizeSectionPresentation(value) {
  const fallback = defaultSectionPresentation();
  const source = object(value); const layout = object(source.layout); const desktop = object(layout.desktop); const mobile = object(layout.mobile); const text = object(source.text_style); const responsive = object(source.responsive); const media = object(source.media_presentation);
  return {
    layout: { enabled: layout.enabled === true, template: pick(layout.template, TEMPLATE_VALUES, fallback.layout.template), align_x: pick(layout.align_x, HORIZONTAL_ALIGNMENTS, fallback.layout.align_x), align_y: pick(layout.align_y, VERTICAL_ALIGNMENTS, fallback.layout.align_y), width: pick(layout.width, WIDTH_VALUES, fallback.layout.width), gap: pick(layout.gap, GAP_VALUES, fallback.layout.gap), order: integer(layout.order, 0, 999, 0), z_index: integer(layout.z_index, 0, 9, 0), desktop: { offset_x: number(desktop.offset_x, -30, 30, 0), offset_y: number(desktop.offset_y, -30, 30, 0) }, mobile: { offset_x: number(mobile.offset_x, -30, 30, 0), offset_y: number(mobile.offset_y, -30, 30, 0) } },
    text_style: { enabled: text.enabled === true, preset: pick(text.preset, PRESET_VALUES, fallback.text_style.preset), weight: integer(text.weight, 300, 800, 400), size_desktop: number(text.size_desktop, 0, 120, 0), size_mobile: number(text.size_mobile, 0, 72, 0), line_height: number(text.line_height, 1, 2.2, 1.4), color: color(text.color), max_width: pick(text.max_width, WIDTH_VALUES, fallback.text_style.max_width) },
    responsive: { enabled: responsive.enabled === true, desktop_visible: responsive.desktop_visible !== false, tablet_visible: responsive.tablet_visible !== false, mobile_visible: responsive.mobile_visible !== false, mobile_template: pick(responsive.mobile_template, MOBILE_TEMPLATE_VALUES, 'inherit') },
    media_presentation: { enabled: media.enabled === true, fit: pick(media.fit, FIT_VALUES, 'cover'), focal_x: number(media.focal_x, 0, 100, 50), focal_y: number(media.focal_y, 0, 100, 50), overlay: pick(media.overlay, OVERLAY_VALUES, 'none'), poster_asset_id: typeof media.poster_asset_id === 'string' || Number.isSafeInteger(media.poster_asset_id) ? String(media.poster_asset_id).trim().slice(0, 120) : '' }
  };
}

export function validateSectionPresentation(value) {
  const source = object(value); const layout = object(source.layout); const desktop = object(layout.desktop); const mobile = object(layout.mobile); const text = object(source.text_style); const media = object(source.media_presentation);
  if (layout.template && !TEMPLATE_VALUES.includes(layout.template)) return '版式模板不受支持。';
  if (layout.align_x && !HORIZONTAL_ALIGNMENTS.includes(layout.align_x)) return '水平对齐方式不受支持。';
  if (layout.align_y && !VERTICAL_ALIGNMENTS.includes(layout.align_y)) return '垂直对齐方式不受支持。';
  if (layout.width && !WIDTH_VALUES.includes(layout.width)) return '内容宽度不受支持。';
  if (layout.gap && !GAP_VALUES.includes(layout.gap)) return '内容间距不受支持。';
  for (const [name, item] of [['桌面', desktop], ['手机', mobile]]) if ((item.offset_x !== undefined && !Number.isFinite(Number(item.offset_x))) || (Number(item.offset_x) < -30 || Number(item.offset_x) > 30) || (item.offset_y !== undefined && !Number.isFinite(Number(item.offset_y))) || (Number(item.offset_y) < -30 || Number(item.offset_y) > 30)) return `${name}位置偏移只能在 -30% 至 30% 之间。`;
  if (layout.z_index !== undefined && (!Number.isInteger(Number(layout.z_index)) || Number(layout.z_index) < 0 || Number(layout.z_index) > 9)) return '层级只能是 0 至 9 的整数。';
  if (text.color && !/^#[0-9a-f]{6}$/i.test(String(text.color).trim())) return '文字颜色必须是 #RRGGBB 格式。';
  if (text.size_desktop !== undefined && (Number(text.size_desktop) < 0 || Number(text.size_desktop) > 120)) return '桌面字号只能在 0 至 120 px 之间。';
  if (text.size_mobile !== undefined && (Number(text.size_mobile) < 0 || Number(text.size_mobile) > 72)) return '手机字号只能在 0 至 72 px 之间。';
  if (text.line_height !== undefined && (Number(text.line_height) < 1 || Number(text.line_height) > 2.2)) return '行高只能在 1 至 2.2 之间。';
  if (media.fit && !FIT_VALUES.includes(media.fit)) return '图片适配方式不受支持。';
  for (const [name, item] of [['图片横向焦点', media.focal_x], ['图片纵向焦点', media.focal_y]]) if (item !== undefined && (!Number.isFinite(Number(item)) || Number(item) < 0 || Number(item) > 100)) return `${name}只能在 0% 至 100% 之间。`;
  return '';
}
