import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('news hero returns to its first frame while card previews hold their final frame', async () => {
  const source = await readFile(new URL('../pages/news.vue', import.meta.url), 'utf8');
  const page = source.replace(/\s+/g, ' ');
  const stopPreview = source.match(/function stopVideoPreview\(event: MouseEvent\) \{([\s\S]*?)\n\}/)?.[1] || '';

  assert.doesNotMatch(page, /<video[^>]*\sloop(?:\s|>)/);
  assert.match(page, /<video v-if="videoNews\.video" id="video-news"[^>]*autoplay muted playsinline[^>]*@ended="resetVideoToFirstFrame"/);
  assert.match(page, /<img v-else class="news-hero-image"[^>]*'\/assets\/news-hero\.jpg'/);
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
  assert.match(page, /v-for="item in pagedVideoShares"/);
  assert.match(page, /mediaOnly: true/);
  assert.match(page, /api\/public\/v1\/media\/news\.video_share\.list/);
  assert.match(page, /:poster="item\.poster \|\| undefined"/);
  assert.match(page, /formatNewsDisplayDate\(articleDate\(article\)\)/);
  assert.doesNotMatch(page, /new Date\(articleDate\(article\)\)\.toLocaleDateString\('zh-CN'\)/);
  assert.match(page, /video: String\(item\.mediaType \|\| ''\)\.toLowerCase\(\) === 'video' \? item\.path : ''/);
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
  assert.match(preview, /elementType: element\.matches\('video'\) \? 'video' : element\.dataset\.cmsPreviewMediaRole \? 'image' : element\.matches\('button,a'\) \? 'button' : 'text'/);
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

test('video share cards are media-only and replaceable in the page canvas', async () => {
  const page = (await readFile(new URL('../pages/news.vue', import.meta.url), 'utf8')).replace(/\s+/g, ' ');

  assert.doesNotMatch(page, /hasArticleBinding/);
  assert.match(page, /mediaAssetId: String\(item.id\)/);
  assert.match(page, /data-cms-preview-media-role="video" data-cms-preview-editable="true"/);
  assert.match(page, /:data-cms-preview-media-asset-id="item.mediaAssetId"/);
  // 卡片不能把中文标题当 data-cms-preview-key：sectionKey 只允许 ASCII 标识，
  // 否则 createCmsVisualEditRequest 会拒绝整次选中，右侧详情永远不会打开。
  assert.doesNotMatch(page, /:data-cms-preview-key="item\.title"/);
  assert.doesNotMatch(page, /:data-cms-preview-readonly="'media-only'"/);
  assert.doesNotMatch(page, /:data-cms-preview-editable="item\.cmsBinding/);
  assert.doesNotMatch(page, /:data-cms-preview-field-path="item\.cmsBinding\?\.fieldPath \|\| undefined"/);
  assert.doesNotMatch(page, /:data-cms-preview-field-path="item\.dateBinding\?\.fieldPath \|\| undefined"/);
  assert.doesNotMatch(page, /:data-cms-preview-field-path="item\.mediaBinding\?\.fieldPath \|\| undefined"/);
});

test('canvas no longer exposes in-list create or delete overlays', async () => {
  const news = await readFile(new URL('../pages/news.vue', import.meta.url), 'utf8');
  assert.doesNotMatch(news, /cms-add-card|cms-delete-card/);
  assert.doesNotMatch(news, /data-cms-preview-action="(?:create-article|delete-article|delete-media)"/);
  assert.doesNotMatch(news, /requestArticleDelete|requestMediaDelete/);
  // The cards themselves must stay editable so media can still be replaced.
  assert.match(news, /data-cms-preview-media-role="cover"/);
  assert.match(news, /data-cms-preview-media-role="video"/);
});

test('video cards let the canvas hit the video element instead of the card link', async () => {
  const page = (await readFile(new URL('../pages/news.vue', import.meta.url), 'utf8')).replace(/\s+/g, ' ');

  // 画布编辑时播放按钮/卡片链接不能吃掉点击，否则选中的是整张卡片而不是 <video>。
  assert.match(page, /<article v-for="item in pagedVideoShares"[^>]*class="news-card video-card" :class="\{ 'cms-preview-edit-mode': cmsVisualEditMode \}"/);
  assert.match(page, /\.cms-preview-edit-mode \.video-card \.card-image:has\(video\)/);
  assert.match(page, /\.cms-preview-edit-mode \.video-card \.play-mark \{ pointer-events: none; \}/);
  assert.match(page, /\.cms-preview-edit-mode \.video-card \.card-image:has\(video\) video \{ pointer-events: auto; \}/);
});

test('video-share cards come from published media assets, not articles', async () => {
  const page = (await readFile(new URL('../pages/news.vue', import.meta.url), 'utf8')).replace(/\s+/g, ' ');

  assert.match(page, /const videoShares = computed\(\(\) => \{[\s\S]*videoShareResponse\.value\?\.data/);
  assert.match(page, /媒体资源生成视频分享卡片|视频分享只有视频/);
  assert.match(page, /mediaOnly: true/);
  assert.match(page, /video: String\(item\.mediaType \|\| ''\)\.toLowerCase\(\) === 'video' \? item\.path : ''/);
  assert.doesNotMatch(page, /articleByAsset/);
  assert.doesNotMatch(page, /mediaBinding: articleVideoMediaBinding\(item\),/);
  assert.doesNotMatch(page, /video: articleVideoPath\(item\),/);
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
  assert.match(detail, /import \{ fieldPresentationAttributes \} from '~\/shared\/section-presentation\.mjs';/);
  assert.match(detail, /<p v-bind="fieldPresentationAttributes\(article, 'category'\)" data-cms-preview-field-path="category" data-cms-preview-position-field-path="field_presentation\.category"\s*>\s*\{\{ articleCategoryLabel\(article\.category\) \}\}\s*<\/p>/);
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

test('media-only video cards open an in-page viewer with a clear back button', async () => {
  const page = (await readFile(new URL('../pages/news.vue', import.meta.url), 'utf8')).replace(/\s+/g, ' ');

  assert.match(page, /const activeVideoShare = ref<Record<string, any> \| null>\(null\)/);
  assert.match(page, /function openVideoShare\(item: Record<string, any>\)/);
  assert.match(page, /function handleVideoShareClick\(event: MouseEvent, item: Record<string, any>\)/);
  assert.match(page, /if \(item\.slug\) return; event\.preventDefault\(\); openVideoShare\(item\);/);
  // 媒体卡不再跳转到裸视频文件，避免游客离开站点后没有返回入口。
  assert.match(page, /: '#video-share';/);
  assert.doesNotMatch(page, /:external="videoShareIsFile\(item\)"/);
  assert.doesNotMatch(page, /:target="videoShareIsFile\(item\) \? '_blank' : undefined"/);
  assert.match(page, /class="video-viewer" role="dialog" aria-modal="true" aria-label="视频播放" @click\.self="closeVideoShare\(\)"/);
  assert.match(page, /← 返回视频分享/);
  assert.match(page, /@click="closeVideoShare\(\)"/);
  assert.match(page, /@click="handleVideoShareClick\(\$event, item\)"/);
});

test('article media captions expose their governed title or description field', async () => {
  const detail = (await readFile(new URL('../pages/news/[slug].vue', import.meta.url), 'utf8')).replace(/\s+/g, ' ');
  assert.match(detail, /<figcaption v-if="!articleMediaIsVideo\(media\) && \(media\.description \|\| media\.title\)"[^>]*:data-cms-preview-field-path="media\.description \? `media\.\$\{index\}\.description` : `media\.\$\{index\}\.title`"/);
  // A video entry must render only the player: the image branch is an explicit
  // `v-if`, not `v-else` on the edit-only poster figure, and the caption is
  // suppressed so the asset title is not repeated under the video.
  assert.match(detail, /<img v-if="!articleMediaIsVideo\(media\)"/);
  assert.doesNotMatch(detail, /<img v-else/);
});

