function nonEmptyString(value, fallback) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
}

export function resolvePageSection(page, id, fallback) {
  const base = { ...fallback };
  if (!page || !Array.isArray(page.sections) || typeof id !== 'string') return base;
  const section = page.sections.find((candidate) => candidate && typeof candidate === 'object' && candidate.id === id);
  if (!section || section.requires_claim_review === true) return base;

  for (const field of ['kicker', 'title', 'body']) {
    if (Object.hasOwn(base, field)) base[field] = nonEmptyString(section[field], base[field]);
  }
  return base;
}
