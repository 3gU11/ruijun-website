import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// The workbench used to be one 5600-line file. It is now the SFC plus extracted
// modules and stylesheets. These checks pin that layout so it cannot quietly
// regress: styles must stay external (and keep their scoping), and the SFC must
// not grow the extracted logic back.

test('module.vue loads its styles from external files with scoping intact', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');

  // `src` on <style> resolves against the extension root, not the SFC's folder —
  // a bare './module.css' builds a path that does not exist.
  assert.match(module, /<style scoped src="\.\/src\/module\.css"><\/style>/);
  assert.match(module, /<style src="\.\/src\/module-global\.css"><\/style>/);

  // No inline style content should come back.
  assert.doesNotMatch(module, /<style[^>]*>\s*\n\s*[.#]/);
});

test('the extracted stylesheets exist and keep their scoped/global split', async () => {
  const scoped = await readFile(new URL('../extensions/content-editor-workbench/src/module.css', import.meta.url), 'utf8');
  const global = await readFile(new URL('../extensions/content-editor-workbench/src/module-global.css', import.meta.url), 'utf8');

  assert.match(scoped, /\.editor-page\{/);

  // The global sheet is deliberately a late override layer, not a disjoint set of
  // rules: it re-states canvas and preview selectors to win the cascade, and it
  // has to reach the preview iframe, which lives outside this component's subtree.
  assert.match(global, /\.visual-canvas-viewport\{/);
  assert.match(global, /ruijun-workbench-active/);
  assert.match(global, /Final canvas sizing overrides/);

  // Overlap is expected, but it must only ever be the global sheet overriding the
  // scoped one — never the reverse, which would mean a rule was filed wrong.
  const scopedSelectors = new Set([...scoped.matchAll(/^([.#][^{;\n]+)\{/gm)].map((m) => m[1].trim()));
  const globalSelectors = new Set([...global.matchAll(/^([.#][^{;\n]+)\{/gm)].map((m) => m[1].trim()));
  const scopedOnly = [...scopedSelectors].filter((s) => !globalSelectors.has(s));
  assert.ok(scopedOnly.length > scopedSelectors.size / 2,
    'most scoped rules should be scoped-only; the global sheet must stay a small override layer');
});

test('module.vue no longer carries the extracted style or data-shape bulk', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  const lines = module.split(/\r?\n/).length;

  // A regression here means someone pasted the styles or the normalizers back in.
  assert.ok(lines < 5100, `module.vue grew back to ${lines} lines`);
  assert.match(module, /from '\.\/draft-shapes\.js'/);
});

test('every implemented tab has a reachable navigation entry', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');

  // The 内容送审 screen existed and was rendered, but nothing ever set activeTab
  // to 'submit', so the only button that calls submitForReview() sat on a screen
  // nobody could open — the publish chain had no way past `draft`.
  const implemented = new Set([...module.matchAll(/activeTab === '([a-z_]+)'/g)].map((m) => m[1]));
  const reachable = new Set([...module.matchAll(/selectTab\('([a-z_]+)'\)/g)].map((m) => m[1]));

  // `home` and `pages` are set directly by the site-area selectors rather than
  // through selectTab, so they are reached by other means.
  const viaOtherMeans = new Set(['home', 'pages', 'homepage_sections']);
  const orphans = [...implemented].filter((t) => !reachable.has(t) && !viaOtherMeans.has(t));
  assert.deepEqual(orphans, [], `these tabs are rendered but unreachable from the UI: ${orphans.join(', ')}`);

  // Submitting a draft is an editor's step, so its entry must not sit behind the
  // administrator-only advanced group.
  assert.match(module, /v-if="workflowAccess"[^>]*aria-label="内容流转"[\s\S]{0,400}selectTab\('submit'\)/);
});
