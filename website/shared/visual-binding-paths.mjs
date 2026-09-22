function index(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function controlledIdentity(section) {
  const collection = String(section?.cms_collection || '').trim();
  const itemId = String(section?.cms_item_id ?? '').trim();
  const sectionKey = String(section?.cms_section_key || section?.id || '').trim();
  if (!['pages', 'homepage_sections'].includes(collection) || !itemId || !/^[a-z0-9][a-z0-9_-]{0,79}$/i.test(sectionKey)) return null;
  return { collection, itemId, sectionKey };
}

function mediaFieldForRoles(media, roles) {
  if (!Array.isArray(media)) return null;
  const normalizedRoles = new Set(roles);
  const assetIndex = media.findIndex((entry) => entry && typeof entry === 'object'
    && normalizedRoles.has(String(entry.role || '').trim().toLowerCase())
    && isManagedMediaEntry(entry));
  return assetIndex >= 0 ? `media.${assetIndex}` : null;
}

export function selectSectionMediaEntry(media, role) {
  if (!Array.isArray(media)) return null;
  const normalizedRole = String(role || '').trim();
  const hasPath = (entry) => typeof entry?.path === 'string' && entry.path.trim();
  const indexForRole = (candidateRole) => {
    const matchingRole = (entry) => String(entry?.role || '').trim() === candidateRole;
    const resolvedIndex = media.findIndex((entry) => matchingRole(entry) && hasPath(entry));
    return resolvedIndex >= 0 ? resolvedIndex : media.findIndex(matchingRole);
  };
  const exactIndex = indexForRole(normalizedRole);
  const fallbackIndex = exactIndex >= 0 || !normalizedRole ? exactIndex : indexForRole('');
  return fallbackIndex >= 0 ? { index: fallbackIndex, entry: media[fallbackIndex] } : null;
}

function isManagedMediaEntry(entry) {
  return Boolean(entry && typeof entry === 'object' && (
    entry.managed === true || entry.media_asset_id != null || entry.file_id
  ));
}

export function serviceSectionMediaBinding(entry, assetIndex) {
  return managedPageSectionMediaBinding(entry, assetIndex);
}

export function managedPageSectionMediaBinding(entry, assetIndex) {
  if (!isManagedMediaEntry(entry) || !Number.isInteger(assetIndex) || assetIndex < 0) return null;
  const fieldPath = `media.${assetIndex}`;
  return { fieldPath, positionFieldPath: fieldPath };
}

export function homepageReasonBinding(section, sourceSection = section) {
  const identity = controlledIdentity(section);
  if (!identity) return null;
  const dedicated = identity.collection === 'homepage_sections';
  const source = dedicated && sourceSection?.content && typeof sourceSection.content === 'object' && !Array.isArray(sourceSection.content)
    ? sourceSection.content
    : sourceSection;
  const textPath = (field) => Object.hasOwn(source || {}, field) ? `${dedicated ? 'content.' : ''}${field}` : null;
  const media = Array.isArray(sourceSection?.media) ? sourceSection.media : section?.media;
  return {
    ...identity,
    fields: {
      title: textPath('title'),
      body: textPath('body'),
      shortTitle: textPath('shortTitle'),
      introTitle: textPath('introTitle'),
      introDetail: textPath('introDetail') || textPath('body'),
      image: mediaFieldForRoles(media, ['background', 'image', 'photo', 'primary', 'foreground']),
      icon: mediaFieldForRoles(media, ['tab-icon', 'icon', 'thumbnail'])
    }
  };
}

export function homepageFieldPresentationPath(binding, field) {
  const fieldPath = binding?.fields?.[field];
  if (typeof fieldPath !== 'string' || !fieldPath.trim()) return null;
  const normalizedField = String(field || '').trim();
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(normalizedField)) return null;
  const suffix = `.${normalizedField}`;
  if (fieldPath === normalizedField) return `field_presentation.${normalizedField}`;
  if (!fieldPath.endsWith(suffix)) return null;
  return `${fieldPath.slice(0, -suffix.length)}.field_presentation.${normalizedField}`;
}

export function homepageSectionItemBinding(section, sourceSection = section, itemIndex) {
  const identity = controlledIdentity(section);
  const item = index(itemIndex);
  if (!identity || item == null) return null;
  const dedicated = identity.collection === 'homepage_sections';
  const content = dedicated && sourceSection?.content && typeof sourceSection.content === 'object' && !Array.isArray(sourceSection.content)
    ? sourceSection.content
    : sourceSection;
  const container = Array.isArray(content?.items) ? 'items' : (Array.isArray(content?.marquee_items) ? 'marquee_items' : '');
  const sourceItem = container ? content[container][item] : null;
  if (!sourceItem || typeof sourceItem !== 'object' || Array.isArray(sourceItem)) return null;
  const prefix = `${dedicated ? 'content.' : ''}${container}.${item}`;
  const textPath = (field) => Object.hasOwn(sourceItem, field) ? `${prefix}.${field}` : null;
  const role = String(sourceItem.media_role || '').trim().toLowerCase();
  const mediaPath = role ? mediaFieldForRoles(sourceSection?.media || section?.media, [role]) : null;
  const iconMedia = mediaPath && /icon|thumbnail|tab/.test(role);
  return {
    ...identity,
    fields: {
      title: textPath('title'),
      body: textPath('body') || textPath('description'),
      shortTitle: textPath('shortTitle') || textPath('label') || textPath('title'),
      introTitle: textPath('introTitle') || textPath('title'),
      introDetail: textPath('introDetail') || textPath('description') || textPath('body'),
      image: mediaPath && !iconMedia ? mediaPath : null,
      icon: iconMedia ? mediaPath : null
    }
  };
}

const manufacturingTextBindings = Object.freeze({
  'hero-process': { sectionKey: 'hero', fieldPath: 'processTitle' },
  'hero-output': { sectionKey: 'hero', fieldPath: 'outputText' },
  'cnc-title': { sectionKey: 'precision-machining', fieldPath: 'title' },
  'cnc-description': { sectionKey: 'precision-machining', fieldPath: 'description' },
  'cnc-detail': { sectionKey: 'precision-machining', fieldPath: 'detail' },
  'metal-title': { sectionKey: 'sheet-metal', fieldPath: 'title' },
  'metal-description': { sectionKey: 'sheet-metal', fieldPath: 'description' },
  'metal-detail': { sectionKey: 'sheet-metal', fieldPath: 'detail' },
  'assembly-title': { sectionKey: 'standardized-assembly', fieldPath: 'title' },
  'assembly-description': { sectionKey: 'standardized-assembly', fieldPath: 'description' },
  'inspection-title': { sectionKey: 'whole-machine-validation', fieldPath: 'title' },
  'inspection-description': { sectionKey: 'whole-machine-validation', fieldPath: 'description' },
  'electrical-title': { sectionKey: 'electrical-assembly', fieldPath: 'title' },
  'electrical-description': { sectionKey: 'electrical-assembly', fieldPath: 'description' },
  'warehouse-title': { sectionKey: 'smart-warehouse', fieldPath: 'title' },
  'equipment-title': { sectionKey: 'core-equipment', fieldPath: 'title' }
});

export function manufacturingTextBinding(textId) {
  const binding = manufacturingTextBindings[String(textId || '')];
  return binding ? { ...binding } : null;
}

export function serviceOfficeBinding(regionIndex, officeIndex) {
  const region = index(regionIndex);
  const office = index(officeIndex);
  if (region == null || office == null) return null;
  const prefix = `items.${region}`;
  const officePrefix = `${prefix}.offices.${office}`;
  return {
    regionTitle: `${prefix}.title`,
    regionImage: `${prefix}.image`,
    address: `${officePrefix}.address`,
    manager: `${officePrefix}.manager`,
    phone: `${officePrefix}.phone`
  };
}

export function serviceLocationRecordBinding(record) {
  const itemId = String(record?.id ?? '').trim();
  const sourceKey = String(record?.source_key || '').trim();
  if (!itemId || !sourceKey) return null;
  return {
    collection: 'service_locations',
    itemId,
    sourceKey,
    regionTitle: 'region',
    address: String(record?.contact?.address || '').trim() ? 'contact.address' : 'service_scope',
    manager: 'contact.name',
    phone: 'contact.phone'
  };
}

export function qualificationAssetBinding(record, assetIndex) {
  const itemId = String(record?.id || '').trim();
  const asset = index(assetIndex);
  if (!itemId || asset == null) return null;
  return { collection: 'qualifications', itemId, fieldPath: `assets.${asset}` };
}

export function pageSectionMediaBinding(assetIndex) {
  const asset = index(assetIndex);
  if (asset == null) return null;
  const fieldPath = `media.${asset}`;
  return { fieldPath, positionFieldPath: fieldPath };
}
