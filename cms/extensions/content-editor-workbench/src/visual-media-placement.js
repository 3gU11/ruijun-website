const homepageReasonSections = new Set([
  'performance',
  'advanced-manufacturing',
  'industry-leadership'
]);

export function resolveQualificationMediaPlacement({ collection = '', type = '', fieldPath = '', elementType = '' } = {}) {
  if (collection !== 'qualifications' || elementType !== 'image' || !/^assets\.\d+$/.test(fieldPath)) return null;
  const sectionKey = new Map([['certificate', 'certificates'], ['honor', 'honors'], ['patent', 'patents']]).get(type);
  if (!sectionKey) return null;
  return { scope: 'qualification', placementKey: 'qualification.image', elementType: 'image', pageKey: 'about', sectionKey };
}

export function qualificationDraftAssets(value) {
  // Preserve slot indexes and legacy paths; the canvas addresses assets.N.
  return Array.isArray(value) ? structuredClone(value) : [];
}

export function resolveNewsCoverMediaPlacement({ collection = '', category = '', fieldPath = '', elementType = '' } = {}) {
  if (collection !== 'articles' || category !== 'news' || elementType !== 'image') return null;
  if (fieldPath !== 'cover_asset' && !/^media\.\d+\.path$/.test(fieldPath)) return null;
  return { scope: 'article', placementKey: 'news.dynamic_news.cover', elementType: 'image', pageKey: 'news', sectionKey: 'dynamic-news' };
}

/**
 * Resolve the governed placement for homepage reason media selected from the
 * live canvas. The icon and background share a section, so mediaRole is the
 * discriminator that prevents an icon from receiving a background candidate.
 */
export function resolveHomepageReasonMediaPlacement({ collection = '', slug = '', sectionKey = '', mediaRole = '', elementType = '' } = {}) {
  if (collection !== 'pages' || slug !== 'home' || !homepageReasonSections.has(sectionKey)) return null;
  if (mediaRole === 'icon') {
    return { scope: 'homepage', placementKey: 'home.reason.icon', elementType: 'image', pageKey: 'home', sectionKey };
  }
  if (mediaRole === 'foreground' || sectionKey === 'performance') {
    return { scope: 'homepage', placementKey: 'home.reason.machine', elementType: elementType || 'image', pageKey: 'home', sectionKey };
  }
  return { scope: 'homepage', placementKey: 'home.reason.background', elementType: elementType || 'image', pageKey: 'home', sectionKey };
}
