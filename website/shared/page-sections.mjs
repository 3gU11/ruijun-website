import { hasSectionPresentation, normalizeFieldPresentations, normalizeSectionPresentation } from './section-presentation.mjs';

function nonEmptyString(value, fallback) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
}

export function resolvePageSection(page, id, fallback, { allowClaimReview = false } = {}) {
  const base = { ...fallback };
  if (!page || !Array.isArray(page.sections) || typeof id !== 'string') return base;
  const section = page.sections.find((candidate) => candidate && typeof candidate === 'object' && candidate.id === id);
  if (!section || (section.requires_claim_review === true && !allowClaimReview)) return base;

  // Pages sections are nested under the owning page record. Keep the
  // server-issued identity so visual edits route to the correct Directus item.
  if (page.id != null && String(page.id).trim()) {
    base.cms_collection = 'pages';
    base.cms_item_id = String(page.id).trim();
    base.cms_section_key = id;
  }

  // Homepage sections may come from the dedicated collection where editable
  // fields live under `content`. Flatten only that controlled content object;
  // arbitrary CMS metadata must never reach the page.
  const content = section.content && typeof section.content === 'object' && !Array.isArray(section.content)
    ? section.content
    : {};
  const source = { ...content, ...section };
  if (base.content && typeof base.content === 'object' && !Array.isArray(base.content)) base.content = content;

  // Keep only the two server-issued identifiers needed to route a visual edit
  // back to its actual Directus record. These are never inferred client-side.
  if (typeof section.cms_collection === 'string' && section.cms_collection.trim()) base.cms_collection = section.cms_collection.trim();
  if (section.cms_item_id != null && String(section.cms_item_id).trim()) base.cms_item_id = String(section.cms_item_id).trim();

  for (const field of ['kicker', 'title', 'body', 'description', 'detail', 'processTitle', 'outputText', 'image', 'video', 'label', 'href', 'shortTitle', 'introTitle', 'introDetail', 'icon', 'introImage', 'mode', 'unit']) {
    if (Object.hasOwn(base, field)) base[field] = nonEmptyString(source[field], base[field]);
  }
  // The homepage hero stores its governed video as a Directus asset ID. During
  // authenticated preview that ID is resolved to a transient CMS asset URL;
  // preserve only these two explicit fields for the hero instead of opening
  // the resolver to arbitrary section metadata.
  if (id === 'hero') {
    for (const field of ['hero_video_asset_id', 'hero_video_asset_url']) {
      if (typeof source[field] === 'string' && source[field].trim()) base[field] = source[field].trim();
    }
  }
  if (Object.hasOwn(base, 'value') && source.value !== '' && source.value !== null && source.value !== undefined && Number.isFinite(Number(source.value))) {
    base.value = Number(source.value);
  }
  for (const field of ['items', 'links', 'marquee_items']) {
    if (Array.isArray(base[field]) && Array.isArray(source[field])) base[field] = source[field];
  }
  if (base.pagination && typeof base.pagination === 'object' && !Array.isArray(base.pagination)
    && source.pagination && typeof source.pagination === 'object' && !Array.isArray(source.pagination)) {
    base.pagination = { ...base.pagination };
    for (const field of ['page_size', 'previous_label', 'next_label', 'empty_label', 'sort']) {
      if (Object.hasOwn(source.pagination, field)) base.pagination[field] = source.pagination[field];
    }
  }
  if (Array.isArray(section.media)) {
    base.media = section.media;
    const media = section.media.filter((entry) => entry && typeof entry.path === 'string');
    const byRole = (roles, predicate = () => true) => media.find((entry) => roles.includes(String(entry.role || '').trim().toLowerCase()) && predicate(entry)) || media.find((entry) => !String(entry.role || '').trim() && predicate(entry));
    if (Object.hasOwn(base, 'image') && !source.image) base.image = byRole(Object.hasOwn(base, 'background') ? ['image', 'photo', 'primary', 'foreground'] : ['image', 'photo', 'background', 'primary', 'foreground'], (entry) => entry.mediaType !== 'video')?.path || base.image;
    if (Object.hasOwn(base, 'background') && !source.background) base.background = byRole(['background'], (entry) => entry.mediaType !== 'video')?.path || base.background;
    if (Object.hasOwn(base, 'icon') && !source.icon) base.icon = byRole(['icon', 'thumbnail', 'tab-icon'], (entry) => entry.mediaType !== 'video')?.path || base.icon;
    if (Object.hasOwn(base, 'video') && !source.video) base.video = byRole(['video', 'hero-video'], (entry) => entry.mediaType === 'video')?.path || base.video;

    // Repeated cards and nodes declare media_role in the editor. Bind that
    // role to the section's approved media before templates use PSD fallbacks.
    const resolveItems = (items) => Array.isArray(items) ? items.map((item) => {
      if (!item || typeof item !== 'object') return item;
      const role = String(item.media_role || '').trim().toLowerCase();
      if (!role) return item;
      const match = media.find((entry) => String(entry.role || '').trim().toLowerCase() === role);
      if (!match?.path) return item;
      const next = { ...item };
      if (match.mediaType === 'video') next.video = next.video || match.path;
      else {
        next.image = next.image || match.path;
        if (!next.icon && /icon|thumbnail|tab/.test(role)) next.icon = match.path;
      }
      if (!next.alt && match.alt) next.alt = match.alt;
      return next;
    }) : items;
    for (const field of ['items', 'marquee_items']) if (Array.isArray(base[field])) base[field] = resolveItems(base[field]);
  }
  if (hasSectionPresentation(source)) Object.assign(base, normalizeSectionPresentation(source));
  const fieldPresentation = normalizeFieldPresentations(source.field_presentation, Object.keys(source));
  if (Object.keys(fieldPresentation).length) base.field_presentation = fieldPresentation;
  return base;
}
