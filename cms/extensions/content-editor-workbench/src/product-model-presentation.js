const featurePresentationKeyPattern = /^features_(\d{1,2})_(label|detail|note|image)$/;
const introPresentationKeyPattern = /^intro_(title|subtitle|scene|body)$/;
const allowedWeights = new Set([300, 400, 500, 600, 700, 800]);

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function boundedNumber(value, minimum, maximum) {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
}

function hexColor(value) {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : '';
}

function normalizeTextStyle(value) {
  const source = object(value);
  if (!source || source.enabled !== true) return null;
  const result = { enabled: true };
  const weight = Number(source.weight);
  const desktopSize = boundedNumber(source.size_desktop, 0, 120);
  const lineHeight = boundedNumber(source.line_height, 1, 2.2);
  const color = hexColor(source.color);
  if (allowedWeights.has(weight)) result.weight = weight;
  if (desktopSize != null) result.size_desktop = desktopSize;
  if (lineHeight != null) result.line_height = lineHeight;
  if (color) result.color = color;
  return result;
}

function normalizeLayout(value) {
  const source = object(value);
  if (!source || source.enabled !== true) return null;
  const desktop = object(source.desktop);
  const offsetX = boundedNumber(desktop?.offset_x, -30, 30);
  const offsetY = boundedNumber(desktop?.offset_y, -30, 30);
  const result = { enabled: true };
  if (offsetX != null || offsetY != null) {
    result.desktop = {
      ...(offsetX != null ? { offset_x: offsetX } : {}),
      ...(offsetY != null ? { offset_y: offsetY } : {})
    };
  }
  return result;
}

export function normalizeProductModelFeaturePresentation(configuration) {
  const source = object(configuration);
  const features = Array.isArray(source?.features) ? source.features : [];
  const intro = object(source?.intro);
  const fieldPresentation = object(source?.field_presentation);
  if (!fieldPresentation) return {};

  return Object.fromEntries(Object.entries(fieldPresentation).slice(0, 32).flatMap(([key, value]) => {
    const match = key.match(featurePresentationKeyPattern);
    const introMatch = key.match(introPresentationKeyPattern);
    const index = Number(match?.[1]);
    const field = match?.[2];
    const feature = features[index];
    const introField = introMatch?.[1];
    if ((!match || !object(feature) || !Object.hasOwn(feature, field)) && (!introField || !intro || !Object.hasOwn(intro, introField))) return [];
    const presentation = object(value);
    if (!presentation) return [];
    const textStyle = normalizeTextStyle(presentation.text_style);
    const layout = normalizeLayout(presentation.layout);
    if (!textStyle && !layout) return [];
    return [[key, {
      ...(textStyle ? { text_style: textStyle } : {}),
      ...(layout ? { layout } : {})
    }]];
  }));
}
