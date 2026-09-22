const baseUrl = String(process.env.CMS_BASE_URL || '').replace(/\/$/, '');
const token = String(process.env.CMS_WRITE_TOKEN || '').trim();
if (!baseUrl || !token) throw new Error('CMS_BASE_URL and CMS_WRITE_TOKEN are required');

const headers = { Accept: 'application/json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${body?.errors?.[0]?.message || ''}`.trim());
  return body?.data;
}

const pages = await request('/items/pages?filter[slug][_eq]=home&limit=1');
const page = Array.isArray(pages) ? pages[0] : null;
if (!page || !Array.isArray(page.sections)) throw new Error('Published/draft home page with sections was not found');

const existing = await request('/items/homepage_sections?filter[page_key][_eq]=home&limit=100');
const byKey = new Map((Array.isArray(existing) ? existing : []).map((item) => [String(item.section_key), item]));
let created = 0;
let updated = 0;
for (const [index, section] of page.sections.entries()) {
  if (!section || typeof section !== 'object' || !section.id) continue;
  const payload = {
    page_key: 'home', section_key: String(section.id), title: section.title || null, kicker: section.kicker || null,
    body: section.body || null, content: section, media: section.media || null, sort_order: index,
    enabled: section.requires_claim_review !== true, language: page.language || 'zh-CN',
    status: page.status || 'draft', publication_state: page.publication_state || 'unpublished', published_at: page.published_at || null,
    source_url: page.source_url || null, source_document: page.source_document || null, review_note: page.review_note || null
  };
  const current = byKey.get(String(section.id));
  if (current) {
    await request(`/items/homepage_sections/${encodeURIComponent(current.id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
    updated += 1;
  } else {
    await request('/items/homepage_sections', { method: 'POST', body: JSON.stringify(payload) });
    created += 1;
  }
}
console.log(JSON.stringify({ created, updated, sourcePageId: page.id }, null, 2));
