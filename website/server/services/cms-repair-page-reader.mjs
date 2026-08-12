const PAGE_KEYS = new Set(['repair_home', 'repair_new', 'repair_warranty', 'repair_progress']);
const ACTION_KEYS = new Set(['01', '02', '09', '10']);

function isPublished(record, now) {
  if (record?.status !== 'published' || record?.publication_state !== 'published') return false;
  if (!record.published_at) return true;
  const timestamp = Date.parse(record.published_at);
  return Number.isFinite(timestamp) && timestamp <= now;
}

function safeCards(value, type) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const label = String(item.label || item.title || '').trim().slice(0, 120);
    if (!label) return [];
    const number = String(item.number || '').trim().slice(0, 8);
    if (type === 'action' && !ACTION_KEYS.has(number)) return [];
    const image = String(item.image || '').trim();
    return [{
      ...(number ? { number } : {}), label,
      ...(item.title ? { title: String(item.title).trim().slice(0, 120) } : {}),
      ...(item.query ? { query: String(item.query).trim().slice(0, 240) } : {}),
      ...(image && (/^\//.test(image) || /^https:\/\//i.test(image)) ? { image } : {}),
      ...(Number.isFinite(Number(item.sort_order)) ? { sortOrder: Number(item.sort_order) } : {})
    }];
  });
}

function publicConfig(record) {
  return {
    pageKey: record.page_key,
    title: String(record.title || '').slice(0, 240),
    intro: String(record.intro || '').slice(0, 1000),
    heroAsset: String(record.hero_asset || '').trim(),
    modelCards: safeCards(record.model_cards, 'model'),
    actionCards: safeCards(record.action_cards, 'action'),
    processSteps: Array.isArray(record.process_steps) ? record.process_steps.slice(0, 20) : [],
    notices: Array.isArray(record.notices) ? record.notices.slice(0, 20).map((item) => String(item).slice(0, 500)) : [],
    faqRefs: Array.isArray(record.faq_refs) ? record.faq_refs.slice(0, 20).map((item) => String(item).slice(0, 120)) : [],
    seo: record.seo && typeof record.seo === 'object' ? { title: String(record.seo.title || '').slice(0, 240), description: String(record.seo.description || '').slice(0, 500) } : {}
  };
}

export function createCmsRepairPageReader({ endpoint, accessToken = '', fetchImpl = fetch, now = () => Date.now(), cacheTtlMs = 30_000 }) {
  const cache = new Map();
  const headers = { Accept: 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };
  async function get(pageKey) {
    const normalizedKey = String(pageKey || '').trim();
    if (!PAGE_KEYS.has(normalizedKey)) throw new TypeError('page key is invalid');
    const timestamp = now();
    const cached = cache.get(normalizedKey);
    if (cached && timestamp - cached.updatedAt < cacheTtlMs) return { data: cached.data, cache: 'fresh', source: 'cms' };
    if (!endpoint) return { data: cached?.data || null, cache: 'unavailable', source: 'static' };
    try {
      const url = new URL(endpoint);
      url.searchParams.set('filter[page_key][_eq]', normalizedKey);
      url.searchParams.set('filter[status][_eq]', 'published');
      url.searchParams.set('filter[publication_state][_eq]', 'published');
      url.searchParams.set('limit', '1');
      const response = await fetchImpl(url, { headers });
      if (!response.ok) throw new Error(`CMS responded ${response.status}`);
      const body = await response.json();
      const record = Array.isArray(body?.data) ? body.data.find((item) => item?.page_key === normalizedKey && isPublished(item, timestamp)) : null;
      const data = record ? publicConfig(record) : null;
      cache.set(normalizedKey, { data, updatedAt: timestamp });
      return { data, cache: 'fresh', source: 'cms' };
    } catch {
      if (cached) return { data: cached.data, cache: 'stale', source: 'cms' };
      return { data: null, cache: 'unavailable', source: 'static' };
    }
  }
  return { get };
}
