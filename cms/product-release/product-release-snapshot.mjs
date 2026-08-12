import { createHash } from 'node:crypto';

const PRODUCT_COLLECTIONS = Object.freeze(['product_series', 'product_models', 'product_parameters']);

function parseJson(value, fallback) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function text(value, maximum = 500) {
  return typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, maximum) : '';
}

function published(record, now) {
  if (record?.status !== 'published' || record?.publication_state !== 'published') return false;
  if (!record.published_at) return true;
  const timestamp = Date.parse(record.published_at);
  return Number.isFinite(timestamp) && timestamp <= now.getTime();
}

function publicRecord(collection, record) {
  if (!record || typeof record !== 'object') return null;
  if (collection === 'product_series') {
    return {
      series_code: text(record.series_code, 80), slug: text(record.slug, 80), name: text(record.name, 200),
      positioning: text(record.positioning, 2000), scenarios: parseJson(record.scenarios, []),
      capabilities: parseJson(record.capabilities, []), cover_asset: record.cover_asset ?? null,
      sort_order: Number.isFinite(Number(record.sort_order)) ? Number(record.sort_order) : 0,
      language: text(record.language, 20)
    };
  }
  if (collection === 'product_models') {
    return {
      series_code: text(record.series_code, 80), model_code: text(record.model_code, 80), slug: text(record.slug, 80),
      name: text(record.name, 200), parameters: parseJson(record.parameters, {}), configuration: parseJson(record.configuration, {}),
      media: parseJson(record.media, []), resources: parseJson(record.resources, []), case_studies: parseJson(record.case_studies, [])
    };
  }
  return {
    model_code: text(record.model_code, 80), group_name: text(record.group_name, 200), field_name: text(record.field_name, 200),
    value: text(record.value, 500), unit: text(record.unit, 80), sort_order: Number.isFinite(Number(record.sort_order)) ? Number(record.sort_order) : 0,
    test_conditions: text(record.test_conditions, 1000)
  };
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function hashSnapshot(snapshot) {
  return createHash('sha256').update(stable(snapshot)).digest('hex');
}

function duplicateIssues(records, field, prefix) {
  const seen = new Set();
  const issues = [];
  for (const record of records) {
    const value = text(record?.[field], 200);
    if (!value) {
      issues.push(`${prefix}_IDENTIFIER_MISSING`);
    } else if (seen.has(value)) {
      issues.push(`${prefix}_IDENTIFIER_DUPLICATE:${value}`);
    } else {
      seen.add(value);
    }
  }
  return issues;
}

function parameterKey(record) {
  const modelCode = text(record?.model_code, 80);
  const fieldName = text(record?.field_name, 200);
  return modelCode && fieldName ? `${modelCode}\u0000${fieldName}` : '';
}

function collectionDiff(previous, next, keyFor) {
  const before = new Map(previous.map((record) => [keyFor(record), record]).filter(([key]) => key));
  const after = new Map(next.map((record) => [keyFor(record), record]).filter(([key]) => key));
  let added = 0;
  let removed = 0;
  let changed = 0;
  const changedFields = new Set();
  for (const [key, record] of after) {
    if (!before.has(key)) added += 1;
    else if (stable(before.get(key)) !== stable(record)) {
      changed += 1;
      const previousRecord = before.get(key);
      for (const field of new Set([...Object.keys(previousRecord), ...Object.keys(record)])) {
        if (stable(previousRecord[field]) !== stable(record[field])) changedFields.add(field);
      }
    }
  }
  for (const key of before.keys()) if (!after.has(key)) removed += 1;
  const fields = [...changedFields].sort();
  return { added, removed, changed, fields: fields.slice(0, 50), fields_truncated: fields.length > 50 };
}

export function buildProductReleaseSnapshot({ series = [], models = [], parameters = [], releaseKey = 'main', version = 1, now = new Date() } = {}) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new TypeError('now must be a valid Date');
  const publishedSeries = series.filter((record) => published(record, now)).map((record) => publicRecord('product_series', record)).filter((record) => record?.series_code);
  const publishedModels = models.filter((record) => published(record, now)).map((record) => publicRecord('product_models', record)).filter((record) => record?.model_code && record?.series_code);
  const publishedParameters = parameters.filter((record) => published(record, now)).map((record) => publicRecord('product_parameters', record)).filter((record) => record?.model_code && record?.field_name && record?.value);
  const seriesCodes = new Set(publishedSeries.map((record) => record.series_code));
  const modelCodes = new Set(publishedModels.map((record) => record.model_code));
  const issues = [];
  if (!publishedModels.length) issues.push('NO_PUBLISHED_MODELS');
  for (const model of publishedModels) if (!seriesCodes.has(model.series_code)) issues.push(`MODEL_SERIES_MISSING:${model.model_code}`);
  for (const parameter of publishedParameters) if (!modelCodes.has(parameter.model_code)) issues.push(`PARAMETER_MODEL_MISSING:${parameter.model_code}`);
  const snapshot = {
    schema_version: 1, release_key: text(releaseKey, 80) || 'main', version: Number(version) || 1,
    generated_at: now.toISOString(), series: publishedSeries.sort((a, b) => a.sort_order - b.sort_order || a.series_code.localeCompare(b.series_code)),
    models: publishedModels.sort((a, b) => a.model_code.localeCompare(b.model_code)),
    parameters: publishedParameters.sort((a, b) => a.model_code.localeCompare(b.model_code) || a.sort_order - b.sort_order || a.field_name.localeCompare(b.field_name)),
    counts: { series: publishedSeries.length, models: publishedModels.length, parameters: publishedParameters.length }
  };
  return { snapshot, issues: [...new Set(issues)], sourceHash: hashSnapshot(snapshot) };
}

export function parseProductReleaseSnapshot(value) {
  const snapshot = parseJson(value, null);
  if (!snapshot || snapshot.schema_version !== 1 || !Array.isArray(snapshot.series) || !Array.isArray(snapshot.models) || !Array.isArray(snapshot.parameters)) return null;
  return snapshot;
}

export function validateProductReleaseSnapshot(value) {
  const snapshot = parseProductReleaseSnapshot(value);
  if (!snapshot) return ['SNAPSHOT_FORMAT_INVALID'];
  const issues = [
    ...duplicateIssues(snapshot.series, 'series_code', 'SERIES'),
    ...duplicateIssues(snapshot.models, 'model_code', 'MODEL')
  ];
  const parameterKeys = new Set();
  for (const parameter of snapshot.parameters) {
    const key = parameterKey(parameter);
    if (!key) issues.push('PARAMETER_IDENTIFIER_MISSING');
    else if (parameterKeys.has(key)) issues.push(`PARAMETER_IDENTIFIER_DUPLICATE:${key.replace('\u0000', '/')}`);
    else parameterKeys.add(key);
  }
  if (!snapshot.models.length) issues.push('NO_MODELS');
  const seriesCodes = new Set(snapshot.series.map((record) => text(record?.series_code, 80)).filter(Boolean));
  const modelCodes = new Set(snapshot.models.map((record) => text(record?.model_code, 80)).filter(Boolean));
  for (const model of snapshot.models) {
    const modelCode = text(model?.model_code, 80) || 'unknown';
    if (!seriesCodes.has(text(model?.series_code, 80))) issues.push(`MODEL_SERIES_MISSING:${modelCode}`);
  }
  for (const parameter of snapshot.parameters) {
    const modelCode = text(parameter?.model_code, 80) || 'unknown';
    if (!modelCodes.has(modelCode)) issues.push(`PARAMETER_MODEL_MISSING:${modelCode}`);
  }
  const counts = snapshot.counts;
  if (!counts || Number(counts.series) !== snapshot.series.length || Number(counts.models) !== snapshot.models.length || Number(counts.parameters) !== snapshot.parameters.length) {
    issues.push('SNAPSHOT_COUNTS_INVALID');
  }
  return [...new Set(issues)];
}

export function buildRestoredProductReleaseSnapshot({ source, releaseKey = 'main', version, now = new Date() } = {}) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new TypeError('now must be a valid Date');
  if (!Number.isSafeInteger(Number(version)) || Number(version) < 1) throw new TypeError('version must be a positive integer');
  const parsed = parseProductReleaseSnapshot(source);
  const issues = validateProductReleaseSnapshot(source);
  if (!parsed || issues.length) return { snapshot: null, issues, sourceHash: null };
  const snapshot = {
    ...structuredClone(parsed),
    release_key: text(releaseKey, 80) || 'main',
    version: Number(version),
    generated_at: now.toISOString(),
    counts: { series: parsed.series.length, models: parsed.models.length, parameters: parsed.parameters.length }
  };
  return { snapshot, issues: [], sourceHash: hashSnapshot(snapshot) };
}

export function diffProductReleaseSnapshots(previousValue, nextValue) {
  const previous = parseProductReleaseSnapshot(previousValue) || { series: [], models: [], parameters: [] };
  const next = parseProductReleaseSnapshot(nextValue) || { series: [], models: [], parameters: [] };
  return {
    series: collectionDiff(previous.series, next.series, (record) => text(record?.series_code, 80)),
    models: collectionDiff(previous.models, next.models, (record) => text(record?.model_code, 80)),
    parameters: collectionDiff(previous.parameters, next.parameters, parameterKey)
  };
}

export const productReleaseCollections = PRODUCT_COLLECTIONS;
