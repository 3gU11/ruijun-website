export function hydrateFactoryMediaSlots(section) {
  const definitions = {
    factory: { count: 4, prefix: 'factory' },
    partners: { count: 1, prefix: 'partner' },
    'clients-domestic': { count: 5, prefix: 'domestic' },
    'clients-global': { count: 5, prefix: 'global' }
  };
  const definition = section && definitions[section.id];
  if (!definition) return section;
  const { count, prefix } = definition;
  if (!Array.isArray(section.media)) section.media = [];
  if (section.id === 'partners' && section.media.length) return section;
  for (let index = 0; index < count; index += 1) {
    const role = `${prefix}-${index + 1}`;
    if (section.media.some((entry) => entry?.role === role)) continue;
    const legacy = section.media[index];
    if (legacy && typeof legacy === 'object' && !legacy.role) legacy.role = role;
    else section.media.push({ role, media_asset_id: '' });
  }
  return section;
}

export function clientGalleryAssets(section, fallback) {
  const draft = hydrateFactoryMediaSlots({
    id: section?.id,
    media: (Array.isArray(section?.media) ? section.media : []).map((entry) => ({ ...entry }))
  });
  const prefix = section?.id === 'clients-global' ? 'global' : 'domestic';
  const result = fallback.map((original, index) => {
    const role = `${prefix}-${index + 1}`;
    const mediaIndex = draft.media.findIndex((entry) => entry.role === role);
    const asset = draft.media[mediaIndex];
    return {
      ...original,
      ...(asset?.path ? asset : {}),
      mediaSlot: role,
      fieldPath: `media.${mediaIndex}`
    };
  });
  draft.media.forEach((asset, index) => {
    if (asset.path && !new RegExp(`^${prefix}-[1-5]$`).test(asset.role || '')) {
      result.push({ ...asset, fieldPath: `media.${index}`, mediaSlot: asset.role || undefined });
    }
  });
  return result;
}

export function partnerGalleryAssets(section, fallback) {
  const draft = hydrateFactoryMediaSlots({ id: 'partners', media: (Array.isArray(section?.media) ? section.media : []).map((entry) => ({ ...entry })) });
  return draft.media.map((asset, index) => ({
    ...fallback[0],
    ...(asset.path ? asset : {}),
    fieldPath: `media.${index}`
  }));
}

export function factoryGalleryAssets(section, fallback) {
  const draft = hydrateFactoryMediaSlots({ id: 'factory', media: (section?.media || []).map((entry) => ({ ...entry })) });
  const result = fallback.map((original, index) => {
    const role = `factory-${index + 1}`;
    const mediaIndex = draft.media.findIndex((entry) => entry.role === role);
    const asset = draft.media[mediaIndex];
    return {
      ...original,
      ...(asset?.path ? asset : {}),
      mediaSlot: role,
      fieldPath: `media.${mediaIndex}`
    };
  });
  // Existing custom gallery entries remain visible after enabling default slots.
  draft.media.forEach((asset, index) => {
    if (asset.path && !/^factory-[1-4]$/.test(asset.role || '')) {
      result.push({ ...asset, fieldPath: `media.${index}`, mediaSlot: asset.role || undefined });
    }
  });
  return result;
}
