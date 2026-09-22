export const parameterFields = Object.freeze([
  { key: 'xyTravelMm', label: 'X/Y 轴行程', unit: 'mm', kind: 'dimension', placeholder: '未填写' },
  { key: 'zAxisTravelMm', label: 'Z 轴行程', unit: 'mm', kind: 'number', placeholder: '未填写' },
  { key: 'maxWorkpieceMm', label: '最大工件尺寸', unit: 'mm', kind: 'dimension', placeholder: '未填写' },
  { key: 'maxWorkpieceWeightKg', label: '最大工件重量', unit: 'kg', kind: 'number', placeholder: '未填写' },
  { key: 'maxCuttingHeightMm', label: '最大切割高度', unit: 'mm', kind: 'number', placeholder: '未填写' },
  { key: 'maxTaperDegrees', label: '最大锥度', unit: '°', kind: 'number', placeholder: '未填写' },
  { key: 'machineDimensionsMm', label: '机床外形尺寸', unit: 'mm', kind: 'dimension', placeholder: '未填写' },
  { key: 'machineWeightKg', label: '机床重量', unit: 'kg', kind: 'number', placeholder: '未填写' }
]);

export function parameterRecord(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function displayParameterValue(value, field) {
  const current = parameterRecord(value)[field.key];
  if (current == null) return '';
  return field.kind === 'dimension' ? String(current).replaceAll('*', ' × ') : String(current);
}

export function updateParameterValue(value, field, rawValue) {
  const next = { ...parameterRecord(value) };
  const input = String(rawValue ?? '').trim();
  if (!input) {
    delete next[field.key];
    return next;
  }
  if (field.kind === 'number') {
    const number = Number(input);
    if (Number.isFinite(number)) next[field.key] = number;
    return next;
  }
  next[field.key] = input.replace(/\s*[xX×＊*]\s*/g, '*');
  return next;
}
