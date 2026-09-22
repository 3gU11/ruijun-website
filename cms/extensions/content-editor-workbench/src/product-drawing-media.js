function normalizedModelCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function normalizedAssetTitle(asset) {
  return String(asset?.title || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function hasExplicitModelMatch(asset, modelCode) {
  const normalizedCode = normalizedModelCode(modelCode);
  return normalizedCode.length > 0 && normalizedAssetTitle(asset).includes(normalizedCode);
}

export function orderProductDrawingMediaAssets(assets, modelCode) {
  return [...(Array.isArray(assets) ? assets : [])].sort((left, right) => {
    const matchDifference = Number(hasExplicitModelMatch(right, modelCode)) - Number(hasExplicitModelMatch(left, modelCode));
    if (matchDifference) return matchDifference;
    const titleDifference = String(left?.title || left?.original_file_name || '').localeCompare(String(right?.title || right?.original_file_name || ''), 'zh-CN');
    if (titleDifference) return titleDifference;
    return Number(left?.id || 0) - Number(right?.id || 0);
  });
}

export function formatProductDrawingMediaLabel(asset) {
  const title = String(asset?.title || '').trim();
  const fileName = String(asset?.original_file_name || `素材 ${asset?.id ?? ''}`).trim();
  const mimeType = String(asset?.mime_type || '未知类型').trim();
  return title ? `${title} · ${fileName} · ${mimeType}` : `${fileName} · ${mimeType}`;
}
