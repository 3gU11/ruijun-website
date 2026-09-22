import assert from 'node:assert/strict';
import test from 'node:test';
const { createCmsNavigationReader } = await import('../server/services/cms-navigation-reader.mjs');
test('navigation reader only exposes a published site settings record', async () => {
  const reader = createCmsNavigationReader({ endpoint: 'https://cms.test/items/site_settings', fetchImpl: async () => Response.json({ data: [{ setting_key: 'global', navigation: [{ label: '产品中心', href: '/product' }], status: 'published', publication_state: 'published' }, { setting_key: 'draft', status: 'draft' }] }) });
  assert.deepEqual(await reader.get(), { data: { setting_key: 'global', navigation: [{ label: '产品中心', href: '/product' }], status: 'published', publication_state: 'published' }, cache: 'fresh', source: 'cms' });
});

test('navigation reader excludes settings scheduled for a future publication time', async () => {
  const reader = createCmsNavigationReader({ endpoint: 'https://cms.test/items/site_settings', now: () => Date.parse('2026-08-01T00:00:00Z'), fetchImpl: async () => Response.json({ data: [{ setting_key: 'global', navigation: [], status: 'published', publication_state: 'published', published_at: '2026-08-02T00:00:00Z' }] }) });
  assert.deepEqual(await reader.get(), { data: null, cache: 'unavailable', source: 'static' });
});

test('navigation reader sends a configured server-only CMS token upstream', async () => {
  let headers;
  const reader = createCmsNavigationReader({ endpoint: 'https://cms.test/items/site_settings', accessToken: 'server-only-token', fetchImpl: async (_url, options) => {
    headers = options.headers;
    return Response.json({ data: [] });
  } });
  await reader.get();
  assert.equal(headers.Authorization, 'Bearer server-only-token');
});

test('navigation reader resolves governed header and footer assets without changing layout data', async () => {
  const requests = [];
  const reader = createCmsNavigationReader({
    endpoint: 'https://cms.test/items/site_settings',
    mediaAssetsEndpoint: 'https://cms.test/items/media_assets',
    publicAssetBaseUrl: 'https://cms.test',
    fetchImpl: async (url) => {
      requests.push(String(url));
      if (String(url).includes('/items/site_settings')) return Response.json({ data: [{
        setting_key: 'global', brand: { logo_asset: '11' }, footer: { phone_icon_asset: '12' },
        status: 'published', publication_state: 'published'
      }] });
      return Response.json({ data: [
        { id: 11, file_id: 'logo-file', media_type: 'image', status: 'published', publication_state: 'published' },
        { id: 12, file_id: 'phone-file', media_type: 'image', status: 'published', publication_state: 'published' }
      ] });
    }
  });
  const result = await reader.get();
  assert.equal(result.data.brand.logo_path, 'https://cms.test/assets/logo-file');
  assert.equal(result.data.footer.phone_icon_path, 'https://cms.test/assets/phone-file');
  assert.equal(requests.length, 2);
});
