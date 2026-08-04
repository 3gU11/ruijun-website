import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Nuxt header measures the first visual panel and expands only after the opening sequence', async () => {
  const component = await readFile(new URL('../components/SiteHeader.vue', import.meta.url), 'utf8');
  const aboutPage = await readFile(new URL('../pages/about.vue', import.meta.url), 'utf8');
  assert.match(component, /getHeaderLifecycle/);
  assert.match(component, /ref="headerElement"/);
  assert.match(component, /class="site-header".*isWide/s);
  assert.match(component, /nextElementSibling/);
  assert.match(component, /\.site-header\.is-wide/);
  assert.match(component, /@media \(max-width: 760px\).*position: relative/s);
  assert.match(aboutPage, /\.about-page \{ overflow-x: clip; overflow-y: visible;/);
});
