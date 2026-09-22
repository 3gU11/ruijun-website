import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('article detail renders governed rich text while keeping CMS HTML out of templates', async () => {
  const [page, sanitizer] = await Promise.all([
    readFile(new URL('../pages/news/[slug].vue', import.meta.url), 'utf8'),
    readFile(new URL('../utils/safe-rich-text.ts', import.meta.url), 'utf8')
  ]);

  assert.match(page, /v-html="renderSafeRichText\(/);
  assert.match(sanitizer, /allowedTags/);
  assert.match(sanitizer, /script\|style\|iframe\|object\|embed\|form\|svg\|math/);
  assert.match(sanitizer, /javascript:/);
  assert.doesNotMatch(page, /v-html="article\.body/);
});
