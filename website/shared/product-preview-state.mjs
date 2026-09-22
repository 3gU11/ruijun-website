function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function previewCollection(value) {
  return ['product_models', 'product_parameters', 'case_studies'].includes(text(value));
}

const legacyTemplateCardBySeriesCode = Object.freeze({
  'fr-xs-auto': 'auto',
  'fr-auto': 'auto',
  'fr-pro': 'pro',
  'fr-xs-pro': 'pro',
  'ft-xs': 'ft',
  'fl-xs': 'fl'
});

function resolvePreviewCardId(seriesCode, cards, seriesRows) {
  if (!seriesCode) return '';
  const direct = cards.find((card) => text(card?.id) === seriesCode)?.id;
  if (direct) return text(direct);
  const cmsCard = cards.find((card) => text(seriesRows.find((series) => text(series?.slug) === text(card?.id) || text(series?.series_code) === text(card?.id))?.series_code) === seriesCode)?.id;
  if (cmsCard) return text(cmsCard);
  const legacyCardId = legacyTemplateCardBySeriesCode[seriesCode];
  return legacyCardId && cards.some((card) => text(card?.id) === legacyCardId) ? legacyCardId : '';
}

export function resolvePreviewProductSelection(session, cards, series) {
  if (!session || !previewCollection(session.collection)) return null;
  const preview = session.preview && typeof session.preview === 'object' ? session.preview : {};
  const seriesCode = text(preview.series_code);
  const modelCode = text(preview.model_code);
  const catalogCards = Array.isArray(cards) ? cards : [];
  const seriesRows = Array.isArray(series) ? series : [];
  const selectedCard = resolvePreviewCardId(seriesCode, catalogCards, seriesRows);
  if (!selectedCard && !modelCode) return null;
  return { selectedCard, selectedModel: modelCode };
}

export function formatProductParameterValue(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  for (const key of ['value', 'text', 'label', 'name', 'content']) {
    const formatted = formatProductParameterValue(value[key]);
    if (formatted) return formatted;
  }
  return '';
}
