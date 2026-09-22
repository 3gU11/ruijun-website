const TEMPLATES = new Set(['default', 'overlay-left', 'overlay-center', 'overlay-right', 'split-media-left', 'split-media-right', 'stack', 'grid', 'gallery', 'timeline', 'process']);
const MOBILE_TEMPLATES = new Set(['inherit', 'stack', 'grid', 'gallery', 'timeline', 'process']);
const HORIZONTAL_ALIGNMENTS = new Set(['left', 'center', 'right']);
const VERTICAL_ALIGNMENTS = new Set(['top', 'center', 'bottom']);
const WIDTHS = new Set(['narrow', 'normal', 'wide', 'full']);
const GAPS = new Set(['none', 'small', 'medium', 'large']);
const PRESETS = new Set(['inherit', 'hero', 'section-title', 'body', 'data', 'card-title', 'caption', 'button']);
const FITS = new Set(['cover', 'contain']);
const OVERLAYS = new Set(['none', 'dark-15', 'dark-30', 'dark-50', 'light-15']);

function boundedNumber(value, minimum, maximum, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : fallback;
}

function pick(value, choices, fallback) {
  return typeof value === 'string' && choices.has(value) ? value : fallback;
}

function hexColor(value, fallback = '') {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim().toUpperCase() : fallback;
}

function positiveInteger(value, minimum, maximum, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum && number <= maximum ? number : fallback;
}

function publicObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function fieldPresentationPath(value) {
  const path = String(value || '').trim();
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(path) && !['__proto__', 'prototype', 'constructor'].includes(path) ? path : '';
}

export function normalizeFieldPresentations(value, allowedFields = []) {
  const source = publicObject(value);
  const permitted = new Set(Array.isArray(allowedFields) ? allowedFields : []);
  return Object.fromEntries(Object.entries(source)
    .slice(0, 32)
    .flatMap(([fieldPath, presentation]) => {
      const path = fieldPresentationPath(fieldPath);
      return path && (!permitted.size || permitted.has(path)) && presentation && typeof presentation === 'object' && !Array.isArray(presentation)
        ? [[path, normalizeSectionPresentation(presentation)]]
        : [];
    }));
}

export function normalizeSectionPresentation(value) {
  const source = publicObject(value);
  const layoutSource = publicObject(source.layout);
  const desktopSource = publicObject(layoutSource.desktop);
  const mobileSource = publicObject(layoutSource.mobile);
  const textSource = publicObject(source.text_style);
  const responsiveSource = publicObject(source.responsive);
  const mediaSource = publicObject(source.media_presentation);

  return {
    layout: {
      enabled: layoutSource.enabled === true,
      template: pick(layoutSource.template, TEMPLATES, 'default'),
      align_x: pick(layoutSource.align_x, HORIZONTAL_ALIGNMENTS, 'left'),
      align_y: pick(layoutSource.align_y, VERTICAL_ALIGNMENTS, 'top'),
      width: pick(layoutSource.width, WIDTHS, 'normal'),
      gap: pick(layoutSource.gap, GAPS, 'medium'),
      order: positiveInteger(layoutSource.order, 0, 999, 0),
      z_index: positiveInteger(layoutSource.z_index, 0, 9, 0),
      desktop: {
        offset_x: boundedNumber(desktopSource.offset_x, -30, 30, 0),
        offset_y: boundedNumber(desktopSource.offset_y, -30, 30, 0)
      },
      mobile: {
        offset_x: boundedNumber(mobileSource.offset_x, -30, 30, 0),
        offset_y: boundedNumber(mobileSource.offset_y, -30, 30, 0)
      }
    },
    text_style: {
      enabled: textSource.enabled === true,
      preset: pick(textSource.preset, PRESETS, 'inherit'),
      weight: positiveInteger(textSource.weight, 300, 800, 400),
      size_desktop: boundedNumber(textSource.size_desktop, 12, 120, 0),
      size_mobile: boundedNumber(textSource.size_mobile, 12, 72, 0),
      line_height: boundedNumber(textSource.line_height, 1, 2.2, 1.4),
      color: hexColor(textSource.color),
      max_width: pick(textSource.max_width, WIDTHS, 'normal')
    },
    responsive: {
      enabled: responsiveSource.enabled === true,
      desktop_visible: responsiveSource.desktop_visible !== false,
      tablet_visible: responsiveSource.tablet_visible !== false,
      mobile_visible: responsiveSource.mobile_visible !== false,
      mobile_template: pick(responsiveSource.mobile_template, MOBILE_TEMPLATES, 'inherit')
    },
    media_presentation: {
      enabled: mediaSource.enabled === true,
      fit: pick(mediaSource.fit, FITS, 'cover'),
      focal_x: boundedNumber(mediaSource.focal_x, 0, 100, 50),
      focal_y: boundedNumber(mediaSource.focal_y, 0, 100, 50),
      overlay: pick(mediaSource.overlay, OVERLAYS, 'none'),
      poster_asset_id: typeof mediaSource.poster_asset_id === 'string' || Number.isSafeInteger(mediaSource.poster_asset_id)
        ? String(mediaSource.poster_asset_id).trim().slice(0, 120)
        : ''
    }
  };
}

export function hasSectionPresentation(value) {
  const source = publicObject(value);
  return ['layout', 'text_style', 'responsive', 'media_presentation'].some((field) => Object.hasOwn(source, field));
}

export function sectionPresentationStyle(value, viewport = 'desktop') {
  const presentation = normalizeSectionPresentation(value);
  const offset = viewport === 'mobile' ? presentation.layout.mobile : presentation.layout.desktop;
  const widthMap = { narrow: '32rem', normal: '48rem', wide: '66rem', full: '100%' };
  const gapMap = { none: '0', small: '0.75rem', medium: '1.5rem', large: '3rem' };
  const style = {
    '--cms-content-width': widthMap[presentation.layout.width],
    '--cms-content-gap': gapMap[presentation.layout.gap],
    '--cms-offset-x': `${offset.offset_x}%`,
    '--cms-offset-y': `${offset.offset_y}%`,
    '--cms-text-align': presentation.layout.align_x,
    '--cms-text-weight': String(presentation.text_style.weight),
    '--cms-text-line-height': String(presentation.text_style.line_height),
    '--cms-media-fit': presentation.media_presentation.fit,
    '--cms-media-position': `${presentation.media_presentation.focal_x}% ${presentation.media_presentation.focal_y}%`
  };
  if (presentation.text_style.color) style['--cms-text-color'] = presentation.text_style.color;
  if (presentation.text_style.size_desktop) style['--cms-text-size'] = `${presentation.text_style.size_desktop}px`;
  if (viewport === 'mobile' && presentation.text_style.size_mobile) style['--cms-text-size'] = `${presentation.text_style.size_mobile}px`;
  return style;
}

export function sectionPresentationAttributes(value) {
  const presentation = normalizeSectionPresentation(value);
  const fieldPresentations = normalizeFieldPresentations(value?.field_presentation, Object.keys(publicObject(value)));
  const desktop = sectionPresentationStyle(presentation, 'desktop');
  const mobile = sectionPresentationStyle(presentation, 'mobile');
  const verticalMap = { top: 'flex-start', center: 'center', bottom: 'flex-end' };
  const collection = typeof value?.cms_collection === 'string' ? value.cms_collection.trim() : '';
  const itemId = value?.cms_item_id == null ? '' : String(value.cms_item_id).trim();
  const sectionKey = typeof value?.cms_section_key === 'string' ? value.cms_section_key.trim() : '';
  return {
    class: ['cms-presentation', `cms-template-${presentation.layout.template}`, `cms-mobile-template-${presentation.responsive.mobile_template}`],
    style: {
      '--cms-content-width': desktop['--cms-content-width'],
      '--cms-content-gap': desktop['--cms-content-gap'],
      '--cms-offset-x-desktop': desktop['--cms-offset-x'],
      '--cms-offset-y-desktop': desktop['--cms-offset-y'],
      '--cms-offset-x-mobile': mobile['--cms-offset-x'],
      '--cms-offset-y-mobile': mobile['--cms-offset-y'],
      '--cms-text-align': desktop['--cms-text-align'],
      '--cms-align-self': verticalMap[presentation.layout.align_y],
      '--cms-z-index': String(presentation.layout.z_index),
      '--cms-order': String(presentation.layout.order),
      '--cms-text-weight': desktop['--cms-text-weight'],
      '--cms-text-line-height': desktop['--cms-text-line-height'],
      '--cms-text-color': desktop['--cms-text-color'] || 'inherit',
      '--cms-text-size-desktop': desktop['--cms-text-size'] || 'inherit',
      '--cms-text-size-mobile': mobile['--cms-text-size'] || desktop['--cms-text-size'] || 'inherit',
      '--cms-media-fit': desktop['--cms-media-fit'],
      '--cms-media-position': desktop['--cms-media-position']
    },
    'data-cms-template': presentation.layout.template,
    'data-cms-overlay': presentation.media_presentation.overlay,
    'data-cms-layout-enabled': String(presentation.layout.enabled),
    'data-cms-text-enabled': String(presentation.text_style.enabled),
    'data-cms-media-enabled': String(presentation.media_presentation.enabled),
    'data-cms-responsive-enabled': String(presentation.responsive.enabled),
    'data-cms-desktop-visible': String(presentation.responsive.desktop_visible),
    'data-cms-tablet-visible': String(presentation.responsive.tablet_visible),
    'data-cms-mobile-visible': String(presentation.responsive.mobile_visible),
    ...(Object.keys(fieldPresentations).length ? { 'data-cms-field-presentations': JSON.stringify(fieldPresentations) } : {}),
    ...(collection && itemId && sectionKey ? {
      'data-cms-preview-collection': collection,
      'data-cms-preview-item-id': itemId,
      'data-cms-preview-key': sectionKey
    } : {})
  };
}

export function fieldPresentationAttributes(value, fieldPath) {
  const presentation = normalizeFieldPresentations(value?.field_presentation)[fieldPresentationPath(fieldPath)] || normalizeSectionPresentation({});
  const desktop = sectionPresentationStyle(presentation, 'desktop');
  const mobile = sectionPresentationStyle(presentation, 'mobile');
  return {
    class: ['cms-field-presentation'],
    style: {
      '--cms-offset-x-desktop': desktop['--cms-offset-x'],
      '--cms-offset-y-desktop': desktop['--cms-offset-y'],
      '--cms-offset-x-mobile': mobile['--cms-offset-x'],
      '--cms-offset-y-mobile': mobile['--cms-offset-y'],
      '--cms-text-weight': desktop['--cms-text-weight'],
      '--cms-text-line-height': desktop['--cms-text-line-height'],
      '--cms-text-color': desktop['--cms-text-color'] || 'inherit',
      '--cms-text-size-desktop': desktop['--cms-text-size'] || 'inherit',
      '--cms-text-size-mobile': mobile['--cms-text-size'] || desktop['--cms-text-size'] || 'inherit'
    },
    'data-cms-layout-enabled': String(presentation.layout.enabled),
    'data-cms-text-enabled': String(presentation.text_style.enabled)
  };
}

export function positionedItemPresentationAttributes(value) {
  const presentation = normalizeSectionPresentation(value);
  const desktop = sectionPresentationStyle(presentation, 'desktop');
  const mobile = sectionPresentationStyle(presentation, 'mobile');
  return {
    class: ['cms-positioned-item'],
    style: {
      '--cms-offset-x-desktop': desktop['--cms-offset-x'],
      '--cms-offset-y-desktop': desktop['--cms-offset-y'],
      '--cms-offset-x-mobile': mobile['--cms-offset-x'],
      '--cms-offset-y-mobile': mobile['--cms-offset-y']
    },
    'data-cms-layout-enabled': String(presentation.layout.enabled)
  };
}
