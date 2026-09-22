<script setup lang="ts">
import { renderSafeRichText } from '~/utils/safe-rich-text';
import { formatNewsDisplayDate } from '~/shared/news-listing.mjs';
import { fieldPresentationAttributes } from '~/shared/section-presentation.mjs';
import { normalizeArticleBodyMedia } from '~/shared/article-body-media.mjs';

const bodyMediaEntries = (article: any) => normalizeArticleBodyMedia(article?.body_media);

function isArticleVideoMedia(media: Record<string, any>) {
  const mediaType = String(
    media?.mediaType || media?.media_type || '',
  ).trim().toLowerCase();
  const mimeType = String(
    media?.mimeType || media?.mime_type || '',
  ).trim().toLowerCase();
  return mediaType === 'video' || mimeType.startsWith('video/');
}

function articleMediaPoster(
  media: Record<string, any>,
  article: Record<string, any>,
) {
  return String(
    media?.posterPath || media?.poster_path || article?.cover_asset || '',
  );
}

const route = useRoute();
const slug = computed(() => String(route.params.slug || ''));
const { data: response, error: responseError } = await useFetch(
  () => `/api/public/v1/articles/${encodeURIComponent(slug.value)}`,
  {
    watch: [slug],
    default: () => ({ data: null as Record<string, unknown> | null }),
  },
);
// A preview session still reads the public BFF first. Leave an unpublished
// response as an empty shell only for that explicit preview route, so the
// authorized client-side overlay can attach without exposing draft content.
if (responseError.value?.statusCode === 410 && route.query.cmsPreview !== '1')
  throw createError({
    statusCode: 410,
    statusMessage: 'Article is no longer published',
    fatal: true,
  });
const { overlayRecord } = useCmsDraftPreview();
const article = computed(() =>
  overlayRecord(
    'articles',
    response.value?.data || null,
    (draft) => draft.slug === slug.value,
  ),
);
useSeoMeta({
  title: () => String(article.value?.title || '文章详情'),
  description: () =>
    String(article.value?.summary || '瑞钧智科新闻与技术媒体信息。'),
});
</script>

<template>
  <main class="article-page">
    <SiteHeader />
    <article
      v-if="article"
      id="cms-preview-article"
      class="article"
      data-cms-preview-key="cms-preview-article"
      data-cms-preview-collection="articles"
      :data-cms-preview-item-id="article?.id"
    >
      <NuxtLink to="/news">新闻媒体</NuxtLink>
      <p
        v-bind="fieldPresentationAttributes(article, 'category')"
        data-cms-preview-field-path="category"
        data-cms-preview-position-field-path="field_presentation.category"
      >
        {{ article.category || 'news' }}
      </p>
      <h1
        v-bind="fieldPresentationAttributes(article, 'title')"
        data-cms-preview-field-path="title"
        data-cms-preview-position-field-path="field_presentation.title"
      >
        {{ article.title }}
      </h1>
      <time
        v-if="article.display_date || article.published_at"
        v-bind="fieldPresentationAttributes(article, 'display_date')"
        data-cms-preview-field-path="display_date"
        data-cms-preview-position-field-path="field_presentation.display_date"
        >{{
          formatNewsDisplayDate(
            String(article.display_date || article.published_at || ''),
          )
        }}</time
      >
      <p
        v-if="article.summary"
        class="summary"
        v-bind="fieldPresentationAttributes(article, 'summary')"
        data-cms-preview-field-path="summary"
        data-cms-preview-position-field-path="field_presentation.summary"
      >
        {{ article.summary }}
      </p>
      <div
        class="body"
        v-bind="fieldPresentationAttributes(article, 'body')"
        data-cms-preview-field-path="body"
        data-cms-preview-position-field-path="field_presentation.body"
        v-html="renderSafeRichText(article.body || '该文章正文正在准备中。')"
      ></div>
      <div v-if="bodyMediaEntries(article).length" class="article-body-media" data-cms-preview-field-path="body_media">
        <figure v-for="(media, index) in bodyMediaEntries(article)" :key="`${media.path}-${index}`" data-cms-preview-field-path="body_media">
          <img :src="media.path" :alt="media.alt || media.caption || '正文图片'" :style="{width:`${media.width}%`,marginInline:media.align==='center'?'auto':media.align==='right'?'0 0 0 auto':'0 auto 0 0'}"><figcaption v-if="media.caption">{{ media.caption }}</figcaption>
        </figure>
      </div>
      <div
        v-if="Array.isArray(article.media)"
        class="article-media"
        data-cms-preview-field-path="media"
      >
        <figure
          v-for="(media, index) in article.media"
          :key="`${media.path}-${index}`"
        >
          <video
            v-if="isArticleVideoMedia(media)"
            :src="String(media.path)"
            :poster="articleMediaPoster(media, article) || undefined"
            controls
            playsinline
            preload="metadata"
            :data-cms-preview-field-path="`media.${index}.path`"
            data-cms-preview-media-role="video"
          ></video
          ><img
            v-else
            :src="String(media.path)"
            :alt="String(media.alt || article.title)"
            :data-cms-preview-field-path="`media.${index}.path`"
            data-cms-preview-media-role="image"
          />
          <figcaption v-if="media.description || media.title" :data-cms-preview-field-path="media.description ? `media.${index}.description` : `media.${index}.title`">
            {{ media.description || media.title }}
          </figcaption>
        </figure>
      </div>
      <section
        v-if="article.transcript"
        class="transcript"
        aria-labelledby="article-transcript-title"
      >
        <h2 id="article-transcript-title">字幕与文字稿</h2>
        <p data-cms-preview-field-path="transcript">{{ article.transcript }}</p>
      </section>
    </article>
    <section v-else class="not-found">
      <p>NEWS &amp; MEDIA</p>
      <h1>该文章暂未发布</h1>
      <NuxtLink to="/news">返回新闻媒体</NuxtLink>
    </section>
    <SiteFooter />
  </main>
</template>

<style scoped>
.article-page {
  min-height: 100vh;
  background: #0a0a0a;
  color: #fff;
  font-family: Arial, 'Microsoft YaHei', sans-serif;
}
.article,
.not-found {
  max-width: 860px;
  margin: 0 auto;
  padding: 140px 32px 110px;
}
.article > a {
  color: rgb(255 255 255 / 56%);
  text-decoration: none;
  font-size: 13px;
}
.article > p:first-of-type,
.not-found > p {
  margin: 52px 0 14px;
  color: #e33232;
  font-size: 12px;
}
.article h1,
.not-found h1 {
  margin: 0;
  font-size: clamp(42px, 6vw, 76px);
  line-height: 1.08;
  font-weight: 500;
}
.article time {
  display: block;
  margin-top: 24px;
  color: rgb(255 255 255 / 48%);
  font-size: 13px;
}
.summary {
  margin: 48px 0 0;
  max-width: 680px;
  color: rgb(255 255 255 / 75%);
  font-size: 19px;
  line-height: 1.8;
}
.body {
  margin-top: 42px;
  padding-top: 38px;
  border-top: 1px solid rgb(255 255 255 / 22%);
  white-space: pre-wrap;
  color: rgb(255 255 255 / 80%);
  line-height: 2;
}
.not-found {
  min-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.not-found > a {
  display: inline-block;
  width: max-content;
  margin-top: 32px;
  padding: 13px 18px;
  background: #d22323;
  color: #fff;
  text-decoration: none;
}
@media (max-width: 760px) {
  .article,
  .not-found {
    padding: 112px 20px 72px;
  }
  .summary {
    font-size: 17px;
  }
}
</style>

<style scoped>
.article-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--ruijun-paper);
  color: var(--ruijun-ink);
}
.article,
.not-found {
  width: min(860px, calc(100% - 40px));
  max-width: none;
  min-height: 70svh;
  margin: 0 auto;
  padding: 150px 0 110px;
}
.article > a {
  color: #676b6f;
}
.article > a:hover {
  color: var(--ruijun-red);
}
.article > p:first-of-type,
.not-found > p {
  color: var(--ruijun-red);
  font-weight: 700;
}
.article h1,
.not-found h1 {
  color: #17191b;
  font-weight: 600;
}
.article time {
  color: #8a8d91;
}
.summary {
  color: #55595d;
}
.body {
  color: #3d4145;
  border-color: var(--ruijun-line);
}
.article-media {
  display: grid;
  gap: 24px;
  margin-top: 36px;
}
.article-media figure {
  margin: 0;
}
.article-media img,
.article-media video {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
}
.article-media figcaption {
  margin-top: 8px;
  color: #74787c;
  font-size: 13px;
}
.transcript {
  margin-top: 42px;
  padding-top: 28px;
  border-top: 1px solid var(--ruijun-line);
}
.transcript h2 {
  font-size: 22px;
}
.transcript p {
  white-space: pre-wrap;
  color: #55595d;
  line-height: 1.8;
}
.not-found {
  flex: 1;
}
.not-found > a {
  background: var(--ruijun-red);
  color: #fff;
}
@media (max-width: 760px) {
  .article,
  .not-found {
    width: auto;
    padding: 84px 20px 72px;
  }
}
</style>
