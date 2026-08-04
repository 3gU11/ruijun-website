import assert from 'node:assert/strict';
import test from 'node:test';

const { resolveHeaderCta, resolveNavigation } = await import('../shared/site-navigation.mjs');

const fallbackNavigation = [
  { label: '产品中心', href: '/product' },
  { label: '先进智造', href: '/manufacturing' },
  { label: '关于我们', href: '/about' },
  { label: '服务支持', href: '/service' }
];

test('site navigation accepts only complete internal links from published settings', () => {
  const settings = { navigation: [{ label: '产品中心', href: '/product' }, { label: '外部站', href: 'https://example.test' }, { label: '', href: '/about' }] };
  assert.deepEqual(resolveNavigation(settings, fallbackNavigation), [{ label: '产品中心', href: '/product' }]);
});

test('site navigation and header CTA fall back when CMS settings are absent or invalid', () => {
  const fallbackCta = { label: '获取方案', href: '/service' };
  assert.deepEqual(resolveNavigation(null, fallbackNavigation), fallbackNavigation);
  assert.deepEqual(resolveHeaderCta({ contacts: { header_cta: { label: '咨询', href: 'https://example.test' } } }, fallbackCta), fallbackCta);
  assert.deepEqual(resolveHeaderCta({ contacts: { header_cta: { label: '咨询', href: '/service' } } }, fallbackCta), { label: '咨询', href: '/service' });
});
