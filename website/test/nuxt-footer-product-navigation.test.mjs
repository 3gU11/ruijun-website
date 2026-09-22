import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const productTargets = ['workstation', 'auto', 'pro', 'ft', 'fr-y', 'fl'];

test('all shared footer variants link product items to real catalog card anchors', async () => {
  const [psdFooter, siteFooter, manufacturing] = await Promise.all([
    readFile(new URL('../components/PsdFooter.vue', import.meta.url), 'utf8'),
    readFile(new URL('../components/SiteFooter.vue', import.meta.url), 'utf8'),
    readFile(new URL('../pages/manufacturing.vue', import.meta.url), 'utf8')
  ]);

  for (const target of productTargets) {
    assert.match(psdFooter, new RegExp(`/product#${target}`));
    assert.match(siteFooter, new RegExp(`/product#${target}`));
    assert.match(manufacturing, new RegExp(`/product#${target}`));
  }

  assert.match(siteFooter, /href: '\/product#workstation'/);
  assert.match(psdFooter, /text:'FR-Y'/);
  assert.match(siteFooter, /label: 'FR-Y', href: '\/product#fr-y'/);
  assert.match(manufacturing, /text: 'FR-Y'/);
  assert.doesNotMatch(psdFooter, /FR-Y\(pro\)/);
  assert.doesNotMatch(siteFooter, /FR-Y\(pro\)/);
  assert.doesNotMatch(manufacturing, /FR-Y\(pro\)/);
  assert.match(psdFooter, /:external="link\.to\?\.startsWith\('\/product#'\)"/);
  assert.match(manufacturing, /:external="link\.to\?\.startsWith\('\/product#'\)"/);
});

test('product page opens the requested series and corrects cross-page footer scroll restoration', async () => {
  const [page, routerOptions] = await Promise.all([
    readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8'),
    readFile(new URL('../app/router.options.ts', import.meta.url), 'utf8')
  ]);

  assert.match(page, /function openHashProduct\(\)/);
  assert.match(page, /openProduct\(target\)/);
  assert.match(page, /targetElement\.scrollIntoView\(\{ behavior: 'auto', block: 'center' \}\)/);
  assert.match(page, /cancelAnimationFrame\(productHashScrollFrame\)/);

  assert.match(routerOptions, /to\.path === '\/product' && to\.hash && to\.path !== from\.path/);
  assert.match(routerOptions, /hookOnce\('page:loading:end'/);
  assert.match(routerOptions, /window\.scrollY \+ rect\.top - \(\(window\.innerHeight - rect\.height\) \/ 2\)/);

  assert.match(routerOptions, /if \(to\.hash\) return \{ el: to\.hash, behavior: 'auto' \};/);
  assert.match(routerOptions, /if \(to\.hash\) return \{ el: to\.hash, behavior: 'auto' \};[\s\S]*return \{ left: 0, top: 0, behavior: 'auto' \};/);
  assert.doesNotMatch(routerOptions, /if \(savedPosition\) return savedPosition/);
});

test('site footer keeps all valid CMS columns instead of truncating the editor data', async () => {
  const source = await readFile(new URL('../components/SiteFooter.vue', import.meta.url), 'utf8');
  assert.match(source, /if \(normalized\.length\) return normalized;/);
  assert.doesNotMatch(source, /normalized\.slice\(0, 3\)/);
  assert.match(source, /grid-template-columns:31\.5vw repeat\(auto-fit,minmax\(10\.4vw,1fr\)\)/);
});
