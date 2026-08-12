const staticPublicPaths = Object.freeze([
  '/',
  '/product',
  '/product/detail',
  '/manufacturing',
  '/about',
  '/service',
  '/news'
]);

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function validSlug(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value || '').trim());
}

function validSeriesCode(value) {
  return /^[a-z0-9][a-z0-9-]{0,79}$/.test(String(value || '').trim());
}

function normalizeOrigin(value) {
  const origin = String(value || '').trim();
  if (!origin) throw new TypeError('sitemap origin is required');
  const url = new URL(origin);
  if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('sitemap origin must use http or https');
  return url.origin;
}

function absoluteUrl(origin, path) {
  return new URL(path, `${origin}/`).toString();
}

function lastmod(value) {
  const time = Date.parse(String(value || ''));
  return Number.isFinite(time) ? new Date(time).toISOString() : '';
}

function addEntry(entries, origin, path, modifiedAt = '') {
  const url = absoluteUrl(origin, path);
  if (entries.some((entry) => entry.url === url)) return;
  entries.push({ url, lastmod: lastmod(modifiedAt) });
}

export function buildSitemapXml({ origin, articles = [], series = [], products = [] } = {}) {
  const normalizedOrigin = normalizeOrigin(origin);
  const entries = [];
  for (const path of staticPublicPaths) addEntry(entries, normalizedOrigin, path);

  for (const article of Array.isArray(articles) ? articles : []) {
    const slug = String(article?.slug || '').trim();
    if (validSlug(slug)) addEntry(entries, normalizedOrigin, `/news/${encodeURIComponent(slug)}`, article?.published_at);
  }

  for (const item of Array.isArray(series) ? series : []) {
    const code = String(item?.series_code || '').trim();
    if (validSeriesCode(code)) {
      addEntry(entries, normalizedOrigin, `/product/detail?series=${encodeURIComponent(code)}`, item?.published_at);
    }
  }

  for (const product of Array.isArray(products) ? products : []) {
    const slug = String(product?.slug || '').trim();
    if (validSlug(slug)) addEntry(entries, normalizedOrigin, `/product/${encodeURIComponent(slug)}`, product?.published_at);
  }

  const rows = entries.map((entry) => `  <url><loc>${escapeXml(entry.url)}</loc>${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}</url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}

export function buildRobotsTxt({ origin } = {}) {
  const normalizedOrigin = normalizeOrigin(origin);
  return `User-agent: *\nAllow: /\nSitemap: ${normalizedOrigin}/sitemap.xml\n`;
}
