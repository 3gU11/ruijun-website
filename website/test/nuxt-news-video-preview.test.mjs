import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('news hero returns to its first frame while card previews hold their final frame', async () => {
  const source = await readFile(new URL('../pages/news.vue', import.meta.url), 'utf8');
  const page = source.replace(/\s+/g, ' ');
  const stopPreview = source.match(/function stopVideoPreview\(event: MouseEvent\) \{([\s\S]*?)\n\}/)?.[1] || '';

  assert.doesNotMatch(page, /<video[^>]*\sloop(?:\s|>)/);
  assert.match(page, /<video id="video-news"[^>]*autoplay muted playsinline[^>]*@ended="resetVideoToFirstFrame"/);
  assert.match(page, /:poster="videoNews\.poster \|\| '\/assets\/news-hero\.jpg'"/);
  assert.match(page, /:data-cms-preview-field-path="newsSectionMediaBinding\(newsHero, 'video'\)\?\.fieldPath \|\| \(newsHero\.video \? 'video' : undefined\)"/);
  assert.match(source, /\.hero-overlay\s*\{[^}]*pointer-events:\s*none;/s);
  assert.match(page, /newsSectionMediaBinding/);
  assert.match(page, /function resetVideoToFirstFrame[\s\S]*?video\.currentTime = 0;/);
  assert.doesNotMatch(stopPreview, /video\.currentTime = 0/);
  assert.match(page, /@ended="holdVideoLastFrame"/);
  assert.match(page, /video\.currentTime = video\.duration - 0\.08/);
  assert.match(page, /video\.ended[^\n]*video\.currentTime >= video\.duration - 0\.08/);
  assert.match(page, /normalizeNewsPageSize\(value\)/);
  assert.match(page, /paginateNews\(articles\.value/);
  assert.match(page, /paginateNews\(videoShares\.value/);
  assert.match(page, /dynamicNewsSection\.value/);
  assert.match(page, /videoSharingSection\.value/);
  assert.match(page, /const dynamicNewsPage = ref\(1\);/);
  assert.match(page, /const videoSharePage = ref\(1\);/);
  assert.match(page, /v-for="\(article, index\) in pagedArticles"/);
  assert.match(page, /v-for="\(item, index\) in pagedVideoShares"/);
  assert.match(page, /api\/public\/v1\/media\/news\.video_share\.list/);
  assert.match(page, /:poster="item\.poster \|\| undefined"/);
  assert.match(page, /formatNewsDisplayDate\(articleDate\(article\)\)/);
  assert.doesNotMatch(page, /new Date\(articleDate\(article\)\)\.toLocaleDateString\('zh-CN'\)/);
  assert.match(page, /date: item\.display_date \|\| item\.published_at \|\| ''/);
  assert.match(page, /sortNewsByDisplayDate\(videoShareResponse\.value\?\.data/);
  assert.match(page, /function markVideoPreviewError\(/);
  assert.match(page, /@error="markVideoPreviewError/);
  assert.match(page, /视频暂时无法播放/);
});

test('news hero exposes only the visible caption copy and CTA as editable page-section fields', async () => {
  const page = (await readFile(new URL('../pages/news.vue', import.meta.url), 'utf8')).replace(/\s+/g, ' ');

  assert.match(page, /const newsHero = computed\(\(\) => resolvePageSection\(newsPage\.value, 'hero', \{/);
  assert.match(page, /<div class="hero-caption cms-positioned">\s*<p class="cms-styled-text" v-bind="fieldPresentationAttributes\(newsHero, 'body'\)" data-cms-preview-field-path="body" data-cms-preview-position-field-path="field_presentation\.body">\s*\{\{ videoNews\.summary \}\}\s*<\/p>\s*<NuxtLink[^>]+class="hero-link" v-bind="fieldPresentationAttributes\(newsHero, 'label'\)" data-cms-preview-field-path="label" data-cms-preview-position-field-path="field_presentation\.label">\s*\{\{ newsHero\.label \|\| '动态新闻' \}\}\s*<\/NuxtLink>\s*<\/div>/);
  assert.match(page, /summary: newsHero\.value\.body \|\| heroMedia\.value\?\.description/);
  assert.doesNotMatch(page, /hero-caption[\s\S]{0,400}data-cms-preview-field-path="title"/);
});

test('news hero CTA keeps its own editable label binding and uses an in-page target', async () => {
  const [page, preview] = await Promise.all([
    readFile(new URL('../pages/news.vue', import.meta.url), 'utf8'),
    readFile(new URL('../composables/useCmsDraftPreview.ts', import.meta.url), 'utf8')
  ]);

  assert.match(page, /<NuxtLink :to="newsHero\.href \|\| '#dynamic-news-title'" class="hero-link" v-bind="fieldPresentationAttributes\(newsHero, 'label'\)" data-cms-preview-field-path="label" data-cms-preview-position-field-path="field_presentation\.label">/);
  assert.match(preview, /elementType: element\.matches\('img'\) \? 'image' : element\.matches\('video'\) \? 'video' : element\.matches\('button,a'\) \? 'button' : 'text'/);
  assert.match(preview, /function handleVisualClick\(event: MouseEvent\) \{[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);/);
});

test('video sharing empty state remains an independently bound page-section message until governed videos exist', async () => {
  const page = (await readFile(new URL('../pages/news.vue', import.meta.url), 'utf8')).replace(/\s+/g, ' ');

  assert.match(page, /const videoSharingSection = computed\(\(\) =>\s*resolvePageSection\(newsPage\.value, 'video-sharing',\s*\{\s*title: '视频分享',\s*description: '暂无视频分享。',?\s*\},?\s*\),?\s*\);/);
  assert.match(page, /<section id="video-share"[\s\S]*?data-cms-preview-key="video-sharing"[\s\S]*?<p v-else class="news-empty" v-bind="fieldPresentationAttributes\(videoSharingSection, 'description'\)" data-cms-preview-field-path="description" data-cms-preview-position-field-path="field_presentation\.description">\s*\{\{ videoSharingSection\.description \|\| '暂无已发布视频分享。' \}\}\s*<\/p>/);
  assert.doesNotMatch(page, /data-cms-preview-key="video-sharing"[\s\S]{0,1000}dynamicNewsSection\.description/);
});

test('video sharing title and empty-state message retain separate canvas field paths', async () => {
  const page = (await readFile(new URL('../pages/news.vue', import.meta.url), 'utf8')).replace(/\s+/g, ' ');

  const videoSharingSection = page.match(/<section id="video-share"[\s\S]*?<\/section>/)?.[0] || '';
  assert.match(videoSharingSection, /<h1 id="video-share-title" class="cms-styled-text" v-bind="fieldPresentationAttributes\(videoSharingSection, 'title'\)" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation\.title">\s*\{\{ videoSharingSection\.title \}\}\s*<\/h1>/);
  assert.match(videoSharingSection, /<p v-else class="news-empty" v-bind="fieldPresentationAttributes\(videoSharingSection, 'description'\)" data-cms-preview-field-path="description" data-cms-preview-position-field-path="field_presentation\.description">\s*\{\{ videoSharingSection\.description \|\| '暂无已发布视频分享。' \}\}\s*<\/p>/);
});

test('unmodelled video candidates are read-only instead of being treated as writable news articles', async () => {
  const page = (await readFile(new URL('../pages/news.vue', import.meta.url), 'utf8')).replace(/\s+/g, ' ');

  assert.match(page, /function hasArticleBinding\(item: Record<string, any>\) \{\s*return item\?\.cmsBinding\?\.collection === 'articles' && Boolean\(item\.cmsBinding\?\.itemId\);\s*\}/);
  assert.match(page, /:data-cms-preview-editable="hasArticleBinding\(item\) \? 'true' : undefined"/);
  assert.match(page, /:data-cms-preview-readonly="hasArticleBinding\(item\) \? undefined : 'article-pending'"/);
  assert.match(page, /:data-cms-preview-readonly-reason="hasArticleBinding\(item\) \? undefined : '该候选视频尚未建立“视频分享”文章，不能直接改写页面。请先新建视频分享内容并关联此媒体。'"/);
  assert.match(page, /:data-cms-preview-field-path="item\.cmsBinding\?\.fieldPath \|\| undefined"/);
  assert.match(page, /:data-cms-preview-field-path="item\.dateBinding\?\.fieldPath \|\| undefined"/);
  assert.match(page, /:data-cms-preview-field-path="item\.mediaBinding\?\.fieldPath \|\| undefined"/);
});

test('video-share cards bind their governed article media slot before legacy video_url', async () => {
  const page = (await readFile(new URL('../pages/news.vue', import.meta.url), 'utf8')).replace(/\s+/g, ' ');

  assert.match(page, /function articleVideoMediaBinding\(article: Record<string, any>\) \{/);
  assert.match(page, /articleBinding\(article, `media\.\$\{index\}\.path`\)/);
  assert.match(page, /: articleBinding\(article, 'video_url'\);/);
  assert.match(page, /function articleVideoPath\(article: Record<string, any>\) \{/);
  assert.match(page, /return String\(videoMedia\?\.path \|\| article\.video_url \|\| article\.video \|\| ''\);/);
  assert.match(page, /mediaBinding: articleVideoMediaBinding\(item\),/);
  assert.match(page, /video: articleVideoPath\(item\),/);
});

test('dynamic news cards prefer the governed cover slot over a legacy cover asset so canvas replacement matches the rendered image', async () => {
  const page = (await readFile(new URL('../pages/news.vue', import.meta.url), 'utf8')).replace(/\s+/g, ' ');

  assert.match(page, /function articleImageMediaBinding\(article: Record<string, any>\) \{/);
  assert.match(page, /articleBinding\(article, `media\.\$\{index\}\.path`\)/);
  assert.match(page, /: articleBinding\(article, 'cover_asset'\);/);
  assert.match(page, /function articleCoverPath\(article: Record<string, any>\) \{/);
  assert.match(page, /return String\(imageMedia\?\.path \|\| article\.cover_asset \|\| ''\);/);
  assert.match(page, /image: articleCoverPath\(article\),/);
  assert.match(page, /:data-cms-preview-field-path="article\.mediaBinding\.fieldPath"/);
});

test('dynamic news heading exposes an independent field-level presentation binding', async () => {
  const page = (await readFile(new URL('../pages/news.vue', import.meta.url), 'utf8')).replace(/\s+/g, ' ');
  assert.match(page, /import \{ fieldPresentationAttributes, sectionPresentationAttributes \} from '~\/shared\/section-presentation\.mjs';/);
  assert.match(page, /<h1 id="dynamic-news-title" class="cms-styled-text" v-bind="fieldPresentationAttributes\(dynamicNewsSection, 'title'\)" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation\.title">\s*\{\{ dynamicNewsSection\.title \}\}\s*<\/h1>/);
});

test('news page caption, CTA, and empty-state copy persist independent field-level presentation settings', async () => {
  const page = (await readFile(new URL('../pages/news.vue', import.meta.url), 'utf8')).replace(/\s+/g, ' ');

  assert.match(page, /<p class="cms-styled-text" v-bind="fieldPresentationAttributes\(newsHero, 'body'\)" data-cms-preview-field-path="body" data-cms-preview-position-field-path="field_presentation\.body">/);
  assert.match(page, /<NuxtLink :to="newsHero\.href \|\| '#dynamic-news-title'" class="hero-link" v-bind="fieldPresentationAttributes\(newsHero, 'label'\)" data-cms-preview-field-path="label" data-cms-preview-position-field-path="field_presentation\.label">/);
  assert.match(page, /<p v-else class="news-empty" v-bind="fieldPresentationAttributes\(dynamicNewsSection, 'description'\)" data-cms-preview-field-path="description" data-cms-preview-position-field-path="field_presentation\.description">/);
  assert.match(page, /<p v-else class="news-empty" v-bind="fieldPresentationAttributes\(videoSharingSection, 'description'\)" data-cms-preview-field-path="description" data-cms-preview-position-field-path="field_presentation\.description">/);
});

test('dynamic news card title exposes article-scoped field-level presentation without changing the card layout', async () => {
  const page = (await readFile(new URL('../pages/news.vue', import.meta.url), 'utf8')).replace(/\s+/g, ' ');
  const detail = (await readFile(new URL('../pages/news/[slug].vue', import.meta.url), 'utf8')).replace(/\s+/g, ' ');

  assert.match(page, /<h2 v-bind="fieldPresentationAttributes\(article, 'title'\)" :data-cms-preview-field-path="articleBinding\(article, 'title'\)\.fieldPath" data-cms-preview-position-field-path="field_presentation\.title">/);
  assert.match(page, /<p v-bind="fieldPresentationAttributes\(article, 'category'\)" :data-cms-preview-field-path="articleBinding\(article, 'category'\)\.fieldPath" data-cms-preview-position-field-path="field_presentation\.category">/);
  assert.match(page, /<time v-bind="fieldPresentationAttributes\(article, 'display_date'\)" :data-cms-preview-field-path="articleBinding\(article, 'display_date'\)\.fieldPath" data-cms-preview-position-field-path="field_presentation\.display_date">/);
  assert.match(page, /<h2 v-bind="fieldPresentationAttributes\(item, 'title'\)" :data-cms-preview-field-path="item\.cmsBinding\?\.fieldPath \|\| undefined" data-cms-preview-position-field-path="field_presentation\.title">/);
  assert.match(page, /<time v-bind="fieldPresentationAttributes\(item, 'display_date'\)" :data-cms-preview-field-path="item\.dateBinding\?\.fieldPath \|\| undefined" data-cms-preview-position-field-path="field_presentation\.display_date">/);
  assert.match(detail, /import \{ fieldPresentationAttributes \} from '~\/shared\/section-presentation\.mjs';/);
  assert.match(detail, /<p v-bind="fieldPresentationAttributes\(article, 'category'\)" data-cms-preview-field-path="category" data-cms-preview-position-field-path="field_presentation\.category"\s*>\s*\{\{ article\.category \|\| 'news' \}\}\s*<\/p>/);
  assert.match(detail, /<h1 v-bind="fieldPresentationAttributes\(article, 'title'\)" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation\.title"\s*>\s*\{\{ article\.title \}\}\s*<\/h1>/);
  assert.match(detail, /<time v-if="article\.display_date \|\| article\.published_at" v-bind="fieldPresentationAttributes\(article, 'display_date'\)" data-cms-preview-field-path="display_date" data-cms-preview-position-field-path="field_presentation\.display_date"\s*>/);
  assert.match(detail, /<p v-if="article\.summary" class="summary" v-bind="fieldPresentationAttributes\(article, 'summary'\)" data-cms-preview-field-path="summary" data-cms-preview-position-field-path="field_presentation\.summary"\s*>\s*\{\{ article\.summary \}\}\s*<\/p>/);
  assert.match(detail, /<div class="body" v-bind="fieldPresentationAttributes\(article, 'body'\)" data-cms-preview-field-path="body" data-cms-preview-position-field-path="field_presentation\.body" v-html="renderSafeRichText\(article\.body \|\| '该文章正文正在准备中。'\)"/);
});

test('dynamic news empty state uses its own section description rather than the video-sharing copy', async () => {
  const page = (await readFile(new URL('../pages/news.vue', import.meta.url), 'utf8')).replace(/\s+/g, ' ');

  const dynamicNewsSection = page.match(/<section class="news-section"[\s\S]*?data-cms-preview-key="dynamic-news"[\s\S]*?<\/section>/)?.[0] || '';
  assert.match(dynamicNewsSection, /<p v-else class="news-empty" v-bind="fieldPresentationAttributes\(dynamicNewsSection, 'description'\)" data-cms-preview-field-path="description" data-cms-preview-position-field-path="field_presentation\.description">\s*\{\{ dynamicNewsSection\.description \|\| '暂无已发布动态新闻。' \}\}\s*<\/p>/);
  assert.doesNotMatch(dynamicNewsSection, /videoSharingSection\.description/);
});

test('article media captions expose their governed title or description field', async () => {
  const detail = (await readFile(new URL('../pages/news/[slug].vue', import.meta.url), 'utf8')).replace(/\s+/g, ' ');
  assert.match(detail, /<figcaption v-if="media\.description \|\| media\.title"[^>]*:data-cms-preview-field-path="media\.description \? `media\.\$\{index\}\.description` : `media\.\$\{index\}\.title`"/);
});

