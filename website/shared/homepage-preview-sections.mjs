// Only authenticated preview records supplied by useCmsDraftPreview reach here.
export function overlayHomepageSectionDrafts(page, records = []) {
  const drafts = records.filter(record => record?.page_key === 'home' && record.id != null
    && /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(String(record.section_key || '')));
  if (!drafts.length) return page;
  const sections = [...(Array.isArray(page?.sections) ? page.sections : [])];
  for (const record of drafts) {
    const section = {
      ...record,
      id: record.section_key,
      cms_collection: 'homepage_sections',
      cms_item_id: String(record.id),
      cms_section_key: record.section_key
    };
    const index = sections.findIndex(existing => existing.id === record.section_key);
    if (index < 0) sections.push(section);
    else sections[index] = section;
  }
  return { ...(page || {}), slug: 'home', sections };
}
