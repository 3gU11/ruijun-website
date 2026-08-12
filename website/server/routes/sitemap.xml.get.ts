import { getRequestURL, setHeader } from 'h3';
import { useCmsArticleReader } from '../utils/cms-article-reader';
import { useCmsProductReader } from '../utils/cms-product-reader';
import { buildSitemapXml } from '../services/public-sitemap.mjs';

function settledData(result: PromiseSettledResult<{ data?: unknown }>) {
  if (result.status !== 'fulfilled' || !Array.isArray(result.value?.data)) return [];
  return result.value.data;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const requestOrigin = getRequestURL(event).origin;
  const configuredOrigin = String(config.public?.siteUrl || '').trim();
  const configuredIsLoopback = /^(https?:\/\/)(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(configuredOrigin);
  const origin = configuredOrigin && !configuredIsLoopback ? configuredOrigin : requestOrigin;
  const [articles, series, products] = await Promise.allSettled([
    useCmsArticleReader(config).list(),
    useCmsProductReader(config).listSeries(),
    useCmsProductReader(config).listProducts()
  ]);

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8');
  setHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  return buildSitemapXml({
    origin,
    articles: settledData(articles),
    series: settledData(series),
    products: settledData(products)
  });
});
