import assert from 'node:assert/strict';
import test from 'node:test';

const { buildRobotsTxt, buildSitemapXml } = await import('../server/services/public-sitemap.mjs');

test('public sitemap contains stable routes and only valid published slugs supplied by readers', () => {
  const xml = buildSitemapXml({
    origin: 'https://www.ruijun.example',
    articles: [
      { slug: 'cutting-update', published_at: '2026-08-01T00:00:00.000Z' },
      { slug: 'draft article', published_at: '2026-08-01T00:00:00.000Z' }
    ],
    series: [{ series_code: 'fr-xs', published_at: '2026-08-01T00:00:00.000Z' }],
    products: [{ slug: 'fr400xs', published_at: '2026-08-01T00:00:00.000Z' }, { slug: '../admin' }]
  });

  assert.match(xml, /<loc>https:\/\/www\.ruijun\.example\/news<\/loc>/);
  assert.match(xml, /<loc>https:\/\/www\.ruijun\.example\/news\/cutting-update<\/loc>/);
  assert.match(xml, /<loc>https:\/\/www\.ruijun\.example\/product\/fr400xs<\/loc>/);
  assert.match(xml, /product\/detail\?series=fr-xs/);
  assert.doesNotMatch(xml, /draft%20article|admin/);
  assert.match(xml, /<lastmod>2026-08-01T00:00:00\.000Z<\/lastmod>/);
});

test('robots points crawlers to the same origin sitemap', () => {
  assert.equal(buildRobotsTxt({ origin: 'https://www.ruijun.example/' }), 'User-agent: *\nAllow: /\nSitemap: https://www.ruijun.example/sitemap.xml\n');
});
