import { getRequestURL, setHeader } from 'h3';
import { buildRobotsTxt } from '../services/public-sitemap.mjs';

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  const requestOrigin = getRequestURL(event).origin;
  const configuredOrigin = String(config.public?.siteUrl || '').trim();
  const configuredIsLoopback = /^(https?:\/\/)(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(configuredOrigin);
  const origin = configuredOrigin && !configuredIsLoopback ? configuredOrigin : requestOrigin;
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8');
  setHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  return buildRobotsTxt({ origin });
});
