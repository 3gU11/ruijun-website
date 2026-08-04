<script setup lang="ts">
const route = useRoute();
const slug = computed(() => String(route.params.slug || ''));
const { data: response } = await useFetch(() => `/api/public/v1/articles/${encodeURIComponent(slug.value)}`, { watch: [slug], default: () => ({ data: null as Record<string, unknown> | null }) });
const article = computed(() => response.value?.data || null);
useSeoMeta({ title: () => String(article.value?.title || '文章详情'), description: () => String(article.value?.summary || '瑞钧智科新闻与技术媒体信息。') });
</script>

<template>
  <main class="article-page"><SiteHeader />
    <article v-if="article" class="article"><NuxtLink to="/news">新闻媒体</NuxtLink><p>{{ article.category || 'news' }}</p><h1>{{ article.title }}</h1><time v-if="article.published_at">{{ new Date(String(article.published_at)).toLocaleDateString('zh-CN') }}</time><p v-if="article.summary" class="summary">{{ article.summary }}</p><div class="body">{{ article.body || '该文章正文正在准备中。' }}</div></article>
    <section v-else class="not-found"><p>NEWS &amp; MEDIA</p><h1>该文章暂未发布</h1><NuxtLink to="/news">返回新闻媒体</NuxtLink></section>
    <SiteFooter />
  </main>
</template>

<style scoped>
.article-page{min-height:100vh;background:#0a0a0a;color:#fff;font-family:Arial,"Microsoft YaHei",sans-serif}.article,.not-found{max-width:860px;margin:0 auto;padding:140px 32px 110px}.article>a{color:rgb(255 255 255 / 56%);text-decoration:none;font-size:13px}.article>p:first-of-type,.not-found>p{margin:52px 0 14px;color:#e33232;font-size:12px}.article h1,.not-found h1{margin:0;font-size:clamp(42px,6vw,76px);line-height:1.08;font-weight:500}.article time{display:block;margin-top:24px;color:rgb(255 255 255 / 48%);font-size:13px}.summary{margin:48px 0 0;max-width:680px;color:rgb(255 255 255 / 75%);font-size:19px;line-height:1.8}.body{margin-top:42px;padding-top:38px;border-top:1px solid rgb(255 255 255 / 22%);white-space:pre-wrap;color:rgb(255 255 255 / 80%);line-height:2}.not-found{min-height:calc(100vh - 80px);display:flex;flex-direction:column;justify-content:center}.not-found>a{display:inline-block;width:max-content;margin-top:32px;padding:13px 18px;background:#d22323;color:#fff;text-decoration:none}@media(max-width:760px){.article,.not-found{padding:112px 20px 72px}.summary{font-size:17px}}
</style>

<style scoped>
.article-page { min-height: 100vh; display: flex; flex-direction: column; background: var(--ruijun-paper); color: var(--ruijun-ink); }
.article, .not-found { width: min(860px, calc(100% - 40px)); max-width: none; min-height: 70svh; margin: 0 auto; padding: 150px 0 110px; }
.article > a { color: #676b6f; }
.article > a:hover { color: var(--ruijun-red); }
.article > p:first-of-type, .not-found > p { color: var(--ruijun-red); font-weight: 700; }
.article h1, .not-found h1 { color: #17191b; font-weight: 600; }
.article time { color: #8a8d91; }
.summary { color: #55595d; }
.body { color: #3d4145; border-color: var(--ruijun-line); }
.not-found { flex: 1; }
.not-found > a { background: var(--ruijun-red); color: #fff; }
@media (max-width: 760px) { .article, .not-found { width: auto; padding: 84px 20px 72px; } }
</style>
