<script setup lang="ts">
import { resolvePageSection } from '~/shared/page-sections.mjs';
import { fieldPresentationAttributes, sectionPresentationAttributes } from '~/shared/section-presentation.mjs';
import { managedPageSectionMediaBinding } from '~/shared/visual-binding-paths.mjs';
import { formatNewsDisplayDate, normalizeNewsPageSize, paginateNews, resolveNewsMediaPoster, sortNewsByDisplayDate, splitNewsArticles } from '~/shared/news-listing.mjs';
const route = useRoute();
const { data: response } = await useFetch('/api/public/v1/articles', {
  default: () => ({
    data: [] as Array<Record<string, unknown>>,
    source: 'static',
    cache: 'unavailable',
  }),
});
const { data: heroMediaResponse } = await useFetch('/api/public/v1/media/news.hero.video', { default: () => ({ data: [] as Array<Record<string, any>> }) });
const { data: videoShareResponse } = await useFetch('/api/public/v1/media/news.video_share.list', { default: () => ({ data: [] as Array<Record<string, any>> }) });
const { data: newsPageResponse } = await useFetch('/api/public/v1/pages/news', {
  default: () => ({ data: null as Record<string, any> | null }),
});
const { overlayList, overlayRecord } = useCmsDraftPreview();

// Do not render placeholder/demo articles when the CMS has no published content.
// An explicit empty state makes publication status visible to editors.
const fallbackVideoNews = {
  category: '视频新闻',
  title: '视频新闻',
  summary: '',
  published_at: '',
  video: '',
};
const fallbackNews: Array<Record<string, any>> = [];
const fallbackVideoShares: Array<Record<string, any>> = [];
const cmsArticles = computed(() => overlayList('articles', Array.isArray(response.value?.data) ? response.value.data : []));
const newsPage = computed(() => overlayRecord('pages', newsPageResponse.value?.data || null, (draft) => draft.slug === 'news'));
const newsHero = computed(() =>
  resolvePageSection(newsPage.value, 'hero', {
    title: '视频新闻',
    body: '',
    label: '动态新闻',
    href: '#dynamic-news-title',
    video: '',
    image: '',
    media: [] as Array<Record<string, any>>,
  }),
);
const dynamicNewsSection = computed(() =>
  resolvePageSection(newsPage.value, 'dynamic-news', {
    title: '动态新闻',
    description: '暂无动态新闻。',
  }),
);
const videoSharingSection = computed(() =>
  resolvePageSection(newsPage.value, 'video-sharing', {
    title: '视频分享',
    description: '暂无视频分享。',
  }),
);
function sectionMediaPath(section: Record<string, any>, role: string) {
  const media = Array.isArray(section.media) ? section.media : [];
  return String(media.find((item: any) => String(item?.role || '') === role)?.path || '');
}
function newsSectionMediaBinding(section: Record<string, any>, role: string) {
  const media = Array.isArray(section.media) ? section.media : [];
  const index = media.findIndex((item: any) => String(item?.role || '') === role);
  return index >= 0 ? managedPageSectionMediaBinding(media[index], index) : null;
}
const heroMedia = computed(() => (Array.isArray(heroMediaResponse.value?.data) ? heroMediaResponse.value.data[0] : null));
const videoNews = computed(() => ({
  category: '视频新闻',
  title: newsHero.value.title || heroMedia.value?.title || fallbackVideoNews.title,
  summary: newsHero.value.body || heroMedia.value?.description || fallbackVideoNews.summary,
  published_at: heroMedia.value?.published_at || fallbackVideoNews.published_at,
  video: newsHero.value.video || sectionMediaPath(newsHero.value, 'video') || heroMedia.value?.path || fallbackVideoNews.video,
  poster: newsHero.value.image || sectionMediaPath(newsHero.value, 'poster') || heroMedia.value?.posterPath || '',
}));
const publishedArticles = computed(() => (cmsArticles.value.length ? cmsArticles.value : []));
const articleDate = (article: Record<string, any>) => String(article.display_date || article.published_at || '');
function articleBinding(article: Record<string, any>, fieldPath: string) {
  return {
    collection: article?.id != null ? 'articles' : '',
    itemId: article?.id != null ? String(article.id) : '',
    fieldPath,
  };
}
function articleVideoMediaBinding(article: Record<string, any>) {
  const media = Array.isArray(article?.media) ? article.media : [];
  const index = media.findIndex((entry: any) => {
    const mediaType = String(entry?.mediaType || entry?.media_type || '').trim().toLowerCase();
    const mimeType = String(entry?.mimeType || entry?.mime_type || '').trim().toLowerCase();
    return mediaType === 'video' || mimeType.startsWith('video/');
  });
  // New governed video shares persist their file in media[]. Older imports can
  // still fall back to the legacy video_url field without inventing a slot.
  return index >= 0 ? articleBinding(article, `media.${index}.path`) : articleBinding(article, 'video_url');
}
function articleImageMediaBinding(article: Record<string, any>) {
  const media = Array.isArray(article?.media) ? article.media : [];
  const index = media.findIndex((entry: any) => {
    const mediaType = String(entry?.mediaType || entry?.media_type || '').trim().toLowerCase();
    const mimeType = String(entry?.mimeType || entry?.mime_type || '').trim().toLowerCase();
    return mediaType === 'image' || mimeType.startsWith('image/');
  });
  return index >= 0 ? articleBinding(article, `media.${index}.path`) : articleBinding(article, 'cover_asset');
}
function articleVideoPath(article: Record<string, any>) {
  const media = Array.isArray(article?.media) ? article.media : [];
  const videoMedia = media.find((entry: any) => {
    const mediaType = String(entry?.mediaType || entry?.media_type || '').trim().toLowerCase();
    const mimeType = String(entry?.mimeType || entry?.mime_type || '').trim().toLowerCase();
    return mediaType === 'video' || mimeType.startsWith('video/');
  });
  return String(videoMedia?.path || article.video_url || article.video || '');
}
function articleCoverPath(article: Record<string, any>) {
  const media = Array.isArray(article?.media) ? article.media : [];
  const imageMedia = media.find((entry: any) => {
    const mediaType = String(entry?.mediaType || entry?.media_type || '').trim().toLowerCase();
    const mimeType = String(entry?.mimeType || entry?.mime_type || '').trim().toLowerCase();
    return mediaType === 'image' || mimeType.startsWith('image/');
  });
  // The canvas binds replacement images to the governed media[] slot. Prefer
  // that exact rendered source and only fall back to legacy cover_asset data.
  return String(imageMedia?.path || article.cover_asset || '');
}
function hasArticleBinding(item: Record<string, any>) {
  return item?.cmsBinding?.collection === 'articles' && Boolean(item.cmsBinding?.itemId);
}
const splitArticles = computed(() => splitNewsArticles(publishedArticles.value));
const articles = computed(() =>
  splitArticles.value.articles.map((article) => ({
    ...article,
    image: articleCoverPath(article),
    cmsBinding: articleBinding(article, 'title'),
    mediaBinding: articleImageMediaBinding(article),
  })),
);
const videoShares = computed(() =>
  splitArticles.value.videoShares.length
    ? splitArticles.value.videoShares.map((item: any) => ({
        ...item,
        title: item.title || '视频分享',
        date: articleDate(item),
        video: articleVideoPath(item),
        image: articleCoverPath(item),
        poster: resolveNewsMediaPoster(item),
        slug: item.slug || '',
        id: item.id,
        cmsBinding: articleBinding(item, 'title'),
        mediaBinding: articleVideoMediaBinding(item),
        dateBinding: articleBinding(item, 'display_date'),
      }))
    : Array.isArray(videoShareResponse.value?.data) && videoShareResponse.value.data.length
      ? sortNewsByDisplayDate(videoShareResponse.value?.data).map((item) => ({
          title: item.title || '视频分享',
          date: item.display_date || item.published_at || '',
          video: item.mediaType === 'video' ? item.path : '',
          image: item.mediaType === 'image' ? item.path : '',
          poster: item.posterPath || '',
          id: item.id,
          sort_order: item.sort_order,
        }))
      : fallbackVideoShares,
);
function boundedNewsPageSize(section: Record<string, any>) {
  const value = Number(section?.pagination?.page_size);
  return normalizeNewsPageSize(value);
}
const dynamicNewsPageSize = computed(() => boundedNewsPageSize(dynamicNewsSection.value));
const videoSharePageSize = computed(() => boundedNewsPageSize(videoSharingSection.value));
const dynamicNewsPage = ref(1);
const videoSharePage = ref(1);
const videoPreviewErrors = reactive<Record<string, boolean>>({});
const dynamicNewsPageCount = computed(() => Math.max(1, Math.ceil(articles.value.length / dynamicNewsPageSize.value)));
const videoSharePageCount = computed(() => Math.max(1, Math.ceil(videoShares.value.length / videoSharePageSize.value)));
const pagedArticlesState = computed(() => paginateNews(articles.value, dynamicNewsPage.value, dynamicNewsPageSize.value));
const pagedVideoSharesState = computed(() => paginateNews(videoShares.value, videoSharePage.value, videoSharePageSize.value));
const pagedArticles = computed(() => pagedArticlesState.value.items);
const pagedVideoShares = computed(() => pagedVideoSharesState.value.items);
const dynamicNewsPages = computed(() => Array.from({ length: pagedArticlesState.value.pageCount }, (_, index) => index + 1));
const videoSharePages = computed(() => Array.from({ length: pagedVideoSharesState.value.pageCount }, (_, index) => index + 1));

function setDynamicNewsPage(page: number) {
  dynamicNewsPage.value = Math.min(Math.max(1, page), dynamicNewsPageCount.value);
}

function setVideoSharePage(page: number) {
  videoSharePage.value = Math.min(Math.max(1, page), videoSharePageCount.value);
}

watch(dynamicNewsPageCount, (count) => setDynamicNewsPage(dynamicNewsPage.value > count ? count : dynamicNewsPage.value));
watch(videoSharePageCount, (count) => setVideoSharePage(videoSharePage.value > count ? count : videoSharePage.value));
useSeoMeta({ title: '新闻媒体', description: '瑞钧智科动态新闻与视频分享。' });

function startVideoPreview(event: MouseEvent) {
  const video = (event.currentTarget as HTMLElement).querySelector('video');
  if (!video) return;
  if (video.ended || (Number.isFinite(video.duration) && video.currentTime >= video.duration - 0.08)) {
    video.currentTime = 0;
  }
  video.play().catch(() => undefined);
}

function stopVideoPreview(event: MouseEvent) {
  const video = (event.currentTarget as HTMLElement).querySelector('video');
  if (!video) return;
  video.pause();
}

function holdVideoLastFrame(event: Event) {
  const video = event.currentTarget as HTMLVideoElement;
  video.pause();
  if (Number.isFinite(video.duration) && video.duration > 0.08) {
    video.currentTime = video.duration - 0.08;
  }
}

function resetVideoToFirstFrame(event: Event) {
  const video = event.currentTarget as HTMLVideoElement;
  video.pause();
  video.currentTime = 0;
}

function markVideoPreviewError(event: Event, key = 'video') {
  videoPreviewErrors[key] = true;
  const video = event.currentTarget as HTMLVideoElement;
  video.pause();
}
</script>

<template>
  <NuxtPage v-if="route.path !== '/news'" />
  <main v-else class="news-page">
    <section class="news-hero" v-bind="sectionPresentationAttributes(newsHero)" data-cms-preview-key="hero">
      <SiteHeader />
      <video id="video-news" class="news-hero-image" :src="videoNews.video" :poster="videoNews.poster || '/assets/news-hero.jpg'" :data-cms-preview-field-path="newsSectionMediaBinding(newsHero, 'video')?.fieldPath || (newsHero.video ? 'video' : undefined)" data-cms-preview-media-role="video" autoplay muted playsinline preload="auto" :aria-label="videoNews.title" @ended="resetVideoToFirstFrame" @error="markVideoPreviewError($event, 'hero')"></video>
      <p v-if="videoPreviewErrors.hero" class="video-fallback-message">视频暂时无法播放，已显示备用海报。</p>
      <div class="hero-overlay"></div>
      <div class="hero-caption cms-positioned">
        <p class="cms-styled-text" v-bind="fieldPresentationAttributes(newsHero, 'body')" data-cms-preview-field-path="body" data-cms-preview-position-field-path="field_presentation.body">
          {{ videoNews.summary }}
        </p>
        <NuxtLink :to="newsHero.href || '#dynamic-news-title'" class="hero-link" v-bind="fieldPresentationAttributes(newsHero, 'label')" data-cms-preview-field-path="label" data-cms-preview-position-field-path="field_presentation.label">{{ newsHero.label || '动态新闻' }}</NuxtLink>
      </div>
    </section>
    <section class="news-section" v-bind="sectionPresentationAttributes(dynamicNewsSection)" data-cms-preview-key="dynamic-news" aria-labelledby="dynamic-news-title">
      <div class="section-heading cms-positioned">
        <h1 id="dynamic-news-title" class="cms-styled-text" v-bind="fieldPresentationAttributes(dynamicNewsSection, 'title')" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">
          {{ dynamicNewsSection.title }}
        </h1>
      </div>
      <div v-if="pagedArticles.length" class="news-grid">
        <article v-for="(article, index) in pagedArticles" :key="String(article.slug || article.title)" class="news-card" :data-cms-preview-key="article.slug || article.title" :data-cms-preview-collection="article.cmsBinding.collection" :data-cms-preview-item-id="article.cmsBinding.itemId" data-cms-preview-editable="true">
          <NuxtLink v-if="articleVideoPath(article)" to="#video-news" class="card-image" @mouseenter="startVideoPreview" @mouseleave="stopVideoPreview"><video :src="articleVideoPath(article)" :data-cms-preview-field-path="articleVideoMediaBinding(article).fieldPath" data-cms-preview-media-role="video" muted playsinline preload="metadata" @loadeddata="resetVideoToFirstFrame" @ended="holdVideoLastFrame" @error="markVideoPreviewError($event, `article-${article.id}`)"></video><span v-if="videoPreviewErrors[`article-${article.id}`]" class="video-fallback-message">视频暂时无法播放</span></NuxtLink><NuxtLink v-else class="card-image" :to="article.slug ? `/news/${encodeURIComponent(String(article.slug))}` : '#dynamic-news-title'"><img :src="String(article.image || article.cover_asset || '')" :data-cms-preview-field-path="article.mediaBinding.fieldPath" data-cms-preview-media-role="cover" :alt="String(article.title)" /></NuxtLink>
          <div class="card-copy">
            <p v-bind="fieldPresentationAttributes(article, 'category')" :data-cms-preview-field-path="articleBinding(article, 'category').fieldPath" data-cms-preview-position-field-path="field_presentation.category">
              {{ article.category || '动态新闻' }}
            </p>
            <h2 v-bind="fieldPresentationAttributes(article, 'title')" :data-cms-preview-field-path="articleBinding(article, 'title').fieldPath" data-cms-preview-position-field-path="field_presentation.title">
              <NuxtLink :to="articleVideoPath(article) ? '#video-news' : article.slug ? `/news/${encodeURIComponent(String(article.slug))}` : '#dynamic-news-title'">{{ article.title }}</NuxtLink>
            </h2>
            <time v-bind="fieldPresentationAttributes(article, 'display_date')" :data-cms-preview-field-path="articleBinding(article, 'display_date').fieldPath" data-cms-preview-position-field-path="field_presentation.display_date">{{ formatNewsDisplayDate(articleDate(article)) }}</time>
          </div>
        </article>
      </div>
      <p v-else class="news-empty" v-bind="fieldPresentationAttributes(dynamicNewsSection, 'description')" data-cms-preview-field-path="description" data-cms-preview-position-field-path="field_presentation.description">
        {{ dynamicNewsSection.description || '暂无已发布动态新闻。' }}
      </p>
      <nav class="pagination" aria-label="动态新闻分页">
        <button class="pagination-prev" type="button" aria-label="上一页" :disabled="dynamicNewsPage === 1" @click="setDynamicNewsPage(dynamicNewsPage - 1)">‹</button
        ><button v-for="page in dynamicNewsPages" :key="`dynamic-${page}`" type="button" :class="{ active: dynamicNewsPage === page }" :aria-current="dynamicNewsPage === page ? 'page' : undefined" :aria-label="`第${page}页`" @click="setDynamicNewsPage(page)">
          {{ page }}</button
        ><button class="pagination-next" type="button" aria-label="下一页" :disabled="dynamicNewsPage === dynamicNewsPageCount" @click="setDynamicNewsPage(dynamicNewsPage + 1)">›</button>
      </nav>
    </section>
    <section id="video-share" class="news-section video-section" v-bind="sectionPresentationAttributes(videoSharingSection)" data-cms-preview-key="video-sharing" aria-labelledby="video-share-title">
      <div class="section-heading cms-positioned">
        <h1 id="video-share-title" class="cms-styled-text" v-bind="fieldPresentationAttributes(videoSharingSection, 'title')" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">
          {{ videoSharingSection.title }}
        </h1>
      </div>
      <div v-if="pagedVideoShares.length" class="news-grid">
        <article v-for="(item, index) in pagedVideoShares" :key="item.slug || item.title" class="news-card video-card" :data-cms-preview-key="item.slug || item.title" :data-cms-preview-collection="item.cmsBinding?.collection" :data-cms-preview-item-id="item.cmsBinding?.itemId" :data-cms-preview-editable="hasArticleBinding(item) ? 'true' : undefined" :data-cms-preview-readonly="hasArticleBinding(item) ? undefined : 'article-pending'" :data-cms-preview-readonly-reason="hasArticleBinding(item) ? undefined : '该候选视频尚未建立“视频分享”文章，不能直接改写页面。请先新建视频分享内容并关联此媒体。'">
          <NuxtLink class="card-image" :to="item.slug ? `/news/${encodeURIComponent(item.slug)}` : item.video ? '#video-news' : '#video-share'" @mouseenter="startVideoPreview" @mouseleave="stopVideoPreview"><video v-if="item.video" :src="item.video" :poster="item.poster || undefined" :data-cms-preview-field-path="item.mediaBinding?.fieldPath || undefined" :data-cms-preview-media-role="hasArticleBinding(item) ? 'video' : undefined" muted playsinline preload="metadata" @loadedmetadata="resetVideoToFirstFrame" @ended="holdVideoLastFrame" @error="markVideoPreviewError($event, `share-${item.id}`)"></video><span v-if="videoPreviewErrors[`share-${item.id}`]" class="video-fallback-message">视频暂时无法播放</span><img v-else-if="!item.video" :src="item.image" :data-cms-preview-field-path="item.mediaBinding?.fieldPath || undefined" :data-cms-preview-media-role="hasArticleBinding(item) ? 'cover' : undefined" :alt="item.title" /><span class="play-mark">▶</span></NuxtLink>
          <div class="card-copy">
            <h2 v-bind="fieldPresentationAttributes(item, 'title')" :data-cms-preview-field-path="item.cmsBinding?.fieldPath || undefined" data-cms-preview-position-field-path="field_presentation.title">
              <NuxtLink :to="item.slug ? `/news/${encodeURIComponent(item.slug)}` : item.video ? '#video-news' : '#video-share'">{{ item.title }}</NuxtLink>
            </h2>
            <time v-bind="fieldPresentationAttributes(item, 'display_date')" :data-cms-preview-field-path="item.dateBinding?.fieldPath || undefined" data-cms-preview-position-field-path="field_presentation.display_date">{{ item.date }}</time>
          </div>
        </article>
      </div>
      <p v-else class="news-empty" v-bind="fieldPresentationAttributes(videoSharingSection, 'description')" data-cms-preview-field-path="description" data-cms-preview-position-field-path="field_presentation.description">
        {{ videoSharingSection.description || '暂无已发布视频分享。' }}
      </p>
      <nav class="pagination" aria-label="视频分享分页">
        <button class="pagination-prev" type="button" :aria-label="videoSharingSection.pagination?.previous_label || '上一页'" :disabled="videoSharePage === 1" @click="setVideoSharePage(videoSharePage - 1)">‹</button
        ><button v-for="page in videoSharePages" :key="`video-${page}`" type="button" :class="{ active: videoSharePage === page }" :aria-current="videoSharePage === page ? 'page' : undefined" :aria-label="`第${page}页`" @click="setVideoSharePage(page)">
          {{ page }}</button
        ><button class="pagination-next" type="button" :aria-label="videoSharingSection.pagination?.next_label || '下一页'" :disabled="videoSharePage === videoSharePageCount" @click="setVideoSharePage(videoSharePage + 1)">›</button>
      </nav>
    </section>
  </main>
</template>

<style scoped>
.news-page {
  min-height: 100vh;
  background: #f4f4f3;
  color: #242528;
  font-family: var(--ruijun-font-cn);
}
.news-hero {
  position: relative;
  height: min(43.7vw, 838px);
  min-height: 480px;
  overflow: hidden;
  background: #555;
}
.news-hero-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.hero-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: rgb(24 25 26 / 38%);
}
.hero-caption {
  position: absolute;
  left: max(8.6%, calc((100% - 2745px) / 2));
  bottom: 13%;
  display: flex;
  align-items: center;
  gap: 36px;
  color: rgb(255 255 255 / 78%);
}
.hero-caption p {
  margin: 0;
  font-size: clamp(15px, 0.94vw, 18px);
}
.hero-link {
  padding: 14px 30px;
  color: #fff;
  background: #f52222;
  text-decoration: none;
  font-size: clamp(16px, 1.1vw, 21px);
}
.news-section {
  width: min(74.3vw, 1428px);
  margin: 0 auto;
  padding: clamp(90px, 6.9vw, 132px) 0 clamp(94px, 7.2vw, 138px);
}
.section-heading h1 {
  margin: 0 0 clamp(30px, 2.1vw, 40px);
  font-size: clamp(24px, 1.56vw, 30px);
  font-weight: 500;
}
.news-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(20px, 1.72vw, 33px);
}
.news-card {
  overflow: hidden;
  background: transparent;
  border: 0;
}
.card-image {
  position: relative;
  display: block;
  aspect-ratio: 1.78;
  overflow: hidden;
  background: #202020;
}
.card-image img,
.card-image video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.card-image::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgb(0 0 0 / 4%), rgb(0 0 0 / 54%));
}
.card-copy {
  position: relative;
  padding: 13px 0 0;
}
.card-copy p {
  position: absolute;
  left: 0;
  top: -38px;
  margin: 0;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}
.card-copy h2 {
  margin: 0 0 8px;
  min-height: 38px;
  font-size: clamp(16px, 1.04vw, 20px);
  line-height: 1.35;
  font-weight: 500;
}
.card-copy h2 a {
  color: #222;
  text-decoration: none;
}
.card-copy time {
  color: #777;
  font: 14px var(--ruijun-font-latin);
}
.news-empty {
  min-height: 180px;
  display: grid;
  place-items: center;
  padding: 24px;
  border: 1px dashed #c8c9c6;
  color: #707477;
  text-align: center;
}
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 22px;
  margin-top: clamp(40px, 3.1vw, 60px);
  font: clamp(20px, 1.56vw, 30px) var(--ruijun-font-latin);
}
.pagination button {
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  color: #2b2c30;
  background: transparent;
  font: inherit;
  line-height: 1;
  cursor: pointer;
}
.pagination button:first-child,
.pagination button:last-child {
  color: #fff;
  background: #f52222;
  font-size: 29px;
  line-height: 20px;
}
.pagination button.active {
  color: #f52222;
}
.pagination button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.video-section {
  padding-top: clamp(90px, 6.9vw, 132px);
  padding-bottom: clamp(110px, 8vw, 154px);
}
.video-card .card-copy h2 {
  min-height: 22px;
}
.play-mark {
  position: absolute;
  z-index: 1;
  inset: 50% auto auto 50%;
  width: 46px;
  height: 46px;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  border: 2px solid #fff;
  border-radius: 50%;
  color: #fff;
  font-size: 21px;
}
@media (max-width: 760px) {
  .news-hero {
    height: 65svh;
    min-height: 400px;
  }
  .hero-caption {
    left: 22px;
    right: 22px;
    bottom: 32px;
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }
  .news-section {
    width: auto;
    margin: 0 22px;
  }
  .news-grid {
    grid-template-columns: 1fr;
  }
  .pagination {
    gap: 11px;
    font-size: 18px;
  }
}
/* Each news mode occupies its own viewport; the former title strips are intentionally absent. */
.news-page {
  scroll-snap-type: y proximity;
}
.news-hero,
.news-section {
  scroll-snap-align: start;
}
.news-hero {
  height: 100svh;
  min-height: 560px;
}
.news-section {
  box-sizing: border-box;
  min-height: 100svh;
  padding-top: clamp(72px, 10vh, 120px);
  padding-bottom: 52px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.video-section {
  padding-top: clamp(72px, 10vh, 120px);
}
@media (max-width: 760px) {
  .news-page {
    scroll-snap-type: none;
  }
  .news-hero {
    height: 100svh;
    min-height: 500px;
  }
  .news-section {
    min-height: 100svh;
    padding-top: 82px;
    justify-content: flex-start;
  }
}
.pagination button.pagination-prev,
.pagination button.pagination-next {
  color: #fff;
  background: #f52222;
  font-size: 29px;
  line-height: 20px;
}
</style>
