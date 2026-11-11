import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('news list links only to the public article detail route and the detail page reads only the BFF', async () => {
  const [list, detail] = await Promise.all([
    readFile(new URL('../pages/news.vue', import.meta.url), 'utf8'),
    readFile(new URL('../pages/news/[slug].vue', import.meta.url), 'utf8')
  ]);
  assert.match(list, /\/news\/\$\{encodeURIComponent\(String\(article\.slug\)\)\}/);
  assert.match(detail, /\/api\/public\/v1\/articles\//);
  assert.match(detail, /该文章暂未发布/);
  assert.match(detail, /responseError\.value\?\.statusCode === 410 && route\.query\.cmsPreview !== '1'/);
  assert.doesNotMatch(detail, /CMS_BFF_TOKEN|CMS_WRITE_TOKEN|\/items\/articles/);
});

test('news list keeps the preview query when opening an article detail', async () => {
  const [list, detail] = await Promise.all([
    readFile(new URL('../pages/news.vue', import.meta.url), 'utf8'),
    readFile(new URL('../pages/news/[slug].vue', import.meta.url), 'utf8')
  ]);
  // 从 ?cmsPreview=1 的列表点进详情时必须继续带参数，否则详情页按公开访问返回 410。
  assert.match(list, /const previewQuery = computed\(\(\) => String\(route\.query\.cmsPreview \|\| ''\) === '1'/);
  assert.match(list, /const articleDetailHref = \(article: Record<string, any>\)/);
  assert.match(list, /const videoShareHref = \(item: Record<string, any>\)/);
  assert.match(list, /:to="articleDetailHref\(article\)"/);
  assert.match(list, /:to="videoShareHref\(item\)"/);
  // 列表预览的会话目标是 pages；详情页要按 slug 从 related.articles 里精确取草稿。
  assert.match(detail, /overlayList\('articles', \[\]\)\.find\(\(item: any\) => item\?\.slug === slug\.value\)/);
});

test('news hero consumes governed CMS video and stays empty without published content', async () => {
  const list = await readFile(new URL('../pages/news.vue', import.meta.url), 'utf8');

  assert.doesNotMatch(list, /exhibition-flash-opening\.mp4/);
  assert.match(list, /useFetch\('\/api\/public\/v1\/media\/news\.hero\.video'/);
  assert.match(list, /<video v-if="videoNews\.video" id="video-news" class="news-hero-image"/);
  assert.match(list, /<img v-else class="news-hero-image"/);
  assert.match(list, /:src="videoNews\.video"/);
  assert.match(list, /autoplay muted playsinline/);
  assert.match(list, /#video-news/);
  assert.match(list, /heroMedia\.value\?\.path \|\| fallbackVideoNews\.video/);
  assert.match(list, /const fallbackNews: Array<Record<string, any>> = \[\];/);
  assert.match(list, /videoShareResponse\.value\?\.data/);
  assert.match(list, /mediaOnly: true/);
});

test('article detail exposes a real article visual binding for title, body, date, and media', async () => {
  const detail = await readFile(new URL('../pages/news/[slug].vue', import.meta.url), 'utf8');
  assert.match(detail, /data-cms-preview-key="cms-preview-article"/);
  assert.match(detail, /data-cms-preview-collection="articles"/);
  assert.match(detail, /:data-cms-preview-item-id="article\?\.id"/);
  assert.match(detail, /data-cms-preview-field-path="title"/);
  assert.match(detail, /data-cms-preview-field-path="display_date"/);
  assert.match(detail, /data-cms-preview-field-path="body"/);
  assert.match(detail, /data-cms-preview-field-path="media"/);
});

test('article detail uses the controlled news date formatter for preview and public output', async () => {
  const detail = await readFile(new URL('../pages/news/[slug].vue', import.meta.url), 'utf8');
  assert.match(detail, /formatNewsDisplayDate/);
  assert.match(detail, /formatNewsDisplayDate\(\s*String\(article\.display_date \|\| article\.published_at \|\| ''\),?\s*\)/);
  assert.doesNotMatch(detail, /new Date\(String\(article\.display_date \|\| article\.published_at\)\)\.toLocaleDateString/);
});

test('article detail recognizes governed video media regardless of Directus key casing', async () => {
  const detail = await readFile(new URL('../pages/news/[slug].vue', import.meta.url), 'utf8');
  assert.ok(detail.includes('media?.mediaType || media?.media_type'));
  assert.ok(detail.includes('media?.mimeType || media?.mime_type'));
  assert.ok(detail.includes("mimeType.startsWith('video/')"));
  assert.ok(detail.includes('media?.posterPath || media?.poster_path'));
});

test('article SEO meta prefers the edited seo title and description', async () => {
  const detail = await readFile(new URL('../pages/news/[slug].vue', import.meta.url), 'utf8');
  assert.match(detail, /title: \(\) => String\(article\.value\?\.seo\?\.title \|\| article\.value\?\.title \|\| '文章详情'\)/);
  assert.match(detail, /description: \(\) =>\s*String\(article\.value\?\.seo\?\.description \|\| article\.value\?\.summary \|\| '瑞钧智科新闻与技术媒体信息。'\)/);
});
