<script setup lang="ts">
const route = useRoute();
const { data: response } = await useFetch('/api/public/v1/articles', {
  default: () => ({ data: [] as Array<Record<string, unknown>>, source: 'static', cache: 'unavailable' })
});

const articles = computed(() => Array.isArray(response.value?.data) ? response.value.data : []);
useSeoMeta({ title: '新闻媒体', description: '瑞钧智科新闻、展会与技术媒体信息。' });
</script>

<template>
  <NuxtPage v-if="route.params.slug" />
  <main v-else class="news-page">
    <SiteHeader />
    <section class="news-hero">
      <p>NEWS &amp; MEDIA</p>
      <h1>来自瑞钧的<br>最新信息</h1>
      <span>产品、制造、展会和服务动态将在完成事实与授权审核后发布。</span>
    </section>
    <section class="news-list" aria-labelledby="news-list-title">
      <div class="list-heading"><p>RECENT UPDATES</p><h2 id="news-list-title">新闻媒体</h2></div>
      <div v-if="articles.length" class="articles">
        <article v-for="article in articles" :key="String(article.slug)">
          <p>{{ article.category || 'news' }}</p>
          <h3><NuxtLink :to="`/news/${encodeURIComponent(String(article.slug))}`">{{ article.title }}</NuxtLink></h3>
          <span>{{ article.summary || '已发布内容详情请联系瑞钧获取。' }}</span>
          <time v-if="article.published_at" :datetime="String(article.published_at)">{{ new Date(String(article.published_at)).toLocaleDateString('zh-CN') }}</time>
        </article>
      </div>
      <p v-else class="empty-state">新闻素材正在进行事实、版权与发布范围审核。</p>
    </section>
    <SiteFooter variant="full" />
  </main>
</template>

<style scoped>
.news-page { min-height: 100vh; background: #0a0a0a; color: #fff; font-family: Arial, "Microsoft YaHei", sans-serif; }
.news-hero, .news-list { max-width: 1216px; margin: 0 auto; padding-left: 32px; padding-right: 32px; }
.news-hero { min-height: 56vh; display: flex; flex-direction: column; justify-content: end; padding-bottom: 80px; background: linear-gradient(90deg, #0a0a0a 12%, rgb(10 10 10 / 42%) 65%, #0a0a0a), url('/assets/docx-news.jpg') right center / auto 100% no-repeat; }
.news-hero p, .list-heading p, .articles article > p { margin: 0; color: #e33232; font-size: 12px; }
.news-hero h1 { margin: 18px 0; font-size: clamp(48px, 6.2vw, 82px); line-height: 1.04; font-weight: 500; }
.news-hero > span { max-width: 520px; color: rgb(255 255 255 / 72%); line-height: 1.8; }
.news-list { padding-top: 92px; padding-bottom: 130px; }.list-heading h2 { margin: 12px 0 38px; font-size: 34px; font-weight: 500; }
.articles { border-top: 1px solid rgb(255 255 255 / 24%); }.articles article { position: relative; display: grid; grid-template-columns: 140px minmax(0, 1fr) minmax(180px, .65fr); gap: 28px; padding: 32px 0; border-bottom: 1px solid rgb(255 255 255 / 24%); }.articles h3 { margin: 0; font-size: 28px; font-weight: 500; }.articles span { color: rgb(255 255 255 / 64%); line-height: 1.7; }.articles time { position: absolute; left: 0; bottom: 32px; color: rgb(255 255 255 / 45%); font-size: 12px; }.empty-state { max-width: 600px; padding: 36px 0; border-top: 1px solid rgb(255 255 255 / 24%); color: rgb(255 255 255 / 70%); line-height: 1.8; }
@media (max-width: 760px) { .news-hero, .news-list { padding-left: 20px; padding-right: 20px; }.news-hero { min-height: 60vh; background-size: auto 73%; background-position: right top; }.articles article { grid-template-columns: 1fr; gap: 12px; padding-bottom: 62px; }.articles time { left: 0; bottom: 28px; } }
</style>

<style scoped>
.news-page { min-height: 100vh; background: #f4f4f2; color: #17191b; }
.news-hero { position: relative; max-width: none; min-height: 64svh; display: flex; flex-direction: column; justify-content: flex-end; overflow: hidden; margin: 0; padding: 150px 6.2% 7vh; isolation: isolate; color: #fff; background: #313436 url('/assets/news-hero.jpg') center / cover no-repeat; }
.news-hero::before { content: ""; position: absolute; z-index: -1; inset: 0; background: rgb(5 7 8 / 34%); }
.news-hero p, .list-heading p, .articles article > p { color: var(--ruijun-red); font-weight: 700; }
.news-hero h1 { font-size: clamp(48px, 5.6vw, 74px); font-weight: 600; }
.news-hero > span { max-width: 560px; color: rgb(255 255 255 / 86%); }
.news-list { width: min(var(--ruijun-max), calc(100% - 12.4%)); max-width: none; margin: 0 auto; padding: 92px 0 130px; }
.list-heading { display: grid; grid-template-columns: minmax(220px, .7fr) minmax(0, 1.3fr); gap: 8vw; align-items: end; margin-bottom: 42px; }
.list-heading h2 { margin: 0; font-size: 46px; font-weight: 600; }
.articles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; border: 0; }
.articles article { min-height: 290px; display: flex; flex-direction: column; padding: 26px; background: #fff; border: 1px solid var(--ruijun-line); }
.articles h3 { margin: 44px 0 16px; font-size: 25px; line-height: 1.3; font-weight: 600; }
.articles h3 a { color: #17191b; text-decoration: none; }
.articles h3 a:hover { color: var(--ruijun-red); }
.articles span { color: #686c70; }
.articles time { position: static; display: block; margin-top: auto; padding-top: 22px; color: #94979a; }
.empty-state { max-width: 680px; border-color: var(--ruijun-line); color: #666a6e; }
@media (max-width: 900px) {
  .news-hero { min-height: 58svh; padding: 112px 22px 58px; }
  .news-hero h1 { font-size: 48px; }
  .news-list { width: auto; margin: 0; padding: 64px 22px 78px; }
  .list-heading { grid-template-columns: 1fr; gap: 14px; }
  .list-heading h2 { font-size: 38px; }
  .articles { grid-template-columns: 1fr; }
  .articles article { min-height: 240px; }
}
</style>
