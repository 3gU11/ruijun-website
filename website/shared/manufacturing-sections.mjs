import { resolvePageSection } from './page-sections.mjs';

export const manufacturingSectionKeys = Object.freeze([
  'hero',
  'process',
  'precision-machining',
  'sheet-metal',
  'standardized-assembly',
  'whole-machine-validation',
  'electrical-assembly',
  'smart-warehouse',
  'core-equipment'
]);

function freshFallback(fallback) {
  return {
    processTitle: '',
    outputText: '',
    ...fallback,
    items: Array.isArray(fallback?.items) ? [...fallback.items] : [],
    media: Array.isArray(fallback?.media) ? [...fallback.media] : []
  };
}

// Rebuild from a single page snapshot so a CMS live-preview message cannot
// leave the canvas using sections derived from an earlier record revision.
export function buildManufacturingSections(page, fallback = {}) {
  return new Map(manufacturingSectionKeys.map((id) => [
    id,
    resolvePageSection(page, id, freshFallback(fallback))
  ]));
}
