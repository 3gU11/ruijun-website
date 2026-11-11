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
  assert.match(sanitizer, /safeMediaSrc/);
  assert.match(sanitizer, /api\\\/public\\\/v1\\\/media\\\/asset/);
  assert.match(sanitizer, /data-cms-preview-media-asset-id/);
  assert.match(sanitizer, /data-cms-preview-editable="true"/);
  assert.match(page, /data-cms-preview-inline-edit="false"/);
  assert.match(page, /\.body :deep\(img\)/);
  assert.doesNotMatch(page, /v-html="article\.body/);
});
