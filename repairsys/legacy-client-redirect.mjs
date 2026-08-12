const LEGACY_CUSTOMER_ROUTES = new Map([
  ['/repair/new', '/repair/new'],
  ['/warranty', '/repair/warranty'],
  ['/requests', '/repair/requests'],
  ['/support', '/service']
]);

function canonicalBaseUrl(value) {
  const base = new URL(String(value || 'http://127.0.0.1:4300'));
  base.hash = '';
  base.search = '';
  base.pathname = base.pathname.replace(/\/$/, '');
  return base;
}

export function legacyRedirectFor(requestUrl, nuxtBaseUrl) {
  const incoming = new URL(String(requestUrl || '/'), 'http://legacy-repair.local');
  const destinationPath = LEGACY_CUSTOMER_ROUTES.get(incoming.pathname);
  if (!destinationPath) return null;

  const destination = canonicalBaseUrl(nuxtBaseUrl);
  destination.pathname = `${destination.pathname}/${destinationPath}`.replace(/\/+/g, '/');
  destination.search = incoming.search;
  return { statusCode: 301, location: destination.toString() };
}

function redirectMiddleware(nuxtBaseUrl) {
  return (req, res, next) => {
    const redirect = legacyRedirectFor(req.url, nuxtBaseUrl);
    if (!redirect) return next();
    res.statusCode = redirect.statusCode;
    res.setHeader('Location', redirect.location);
    res.end();
  };
}

export function legacyRedirectPlugin(nuxtBaseUrl = process.env.NUXT_PUBLIC_SITE_URL || process.env.REPAIR_NUXT_BASE_URL) {
  return {
    name: 'legacy-customer-redirect',
    configureServer(server) {
      server.middlewares.use(redirectMiddleware(nuxtBaseUrl));
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirectMiddleware(nuxtBaseUrl));
    }
  };
}

export { LEGACY_CUSTOMER_ROUTES };
