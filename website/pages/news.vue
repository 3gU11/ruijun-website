<script setup lang="ts">
const route = useRoute();
const { data: response } = await useFetch('/api/public/v1/articles', {
  default: () => ({ data: [] as Array<Record<string, unknown>>, source: 'static', cache: 'unavailable' })
});

const videoNews = {
  category: '视频新闻',
  title: '展会快闪',
  summary: '走进瑞钧智科展会现场，了解设备展示与现场交流。',
  published_at: '2026-08-06',
  video: '/assets/exhibition-flash-opening.mp4'
};
const fallbackNews = [
  { category: '动态新闻', title: '2026苏州工业博览会圆满落幕', published_at: '2026-05-12', image: '/assets/docx-news.jpg' },
  { category: '动态新闻', title: '2026第33届中国（温州）国际工业博览会', published_at: '2026-03-22', image: '/assets/docx-products.jpg' },
  { category: '动态新闻', title: '市领导赴苏州瑞钧调研智能制造', published_at: '2026-04-02', image: '/assets/factory.jpg' },
  { category: '动态新闻', title: '2026第28届中国（郑州）装备制造业博览会', published_at: '2026-04-03', image: '/assets/docx-manufacturing.jpg' },
  { category: '动态新闻', title: '2026第十九届慈溪工业博览会', published_at: '2026-04-19', image: '/assets/reason-factory.jpg' }
];
const videoShares = [
  { title: '中走丝线切割机未来', date: '2026/7/15', video: videoNews.video },
  { title: '瑞钧祝您端午安康', date: '2026/6/29', image: '/assets/docx-home.jpg' },
  { title: '库卡联动，协同加工', date: '2026/7/4', image: '/assets/factory.jpg' },
  { title: '细锋双精工，W轴极限', date: '2026/7/4', image: '/assets/reason-efficiency.jpg' },
  { title: '中走丝核心竞争力', date: '2026/7/5', image: '/assets/products.jpg' },
  { title: '瑞钧中走丝-持续精度的源头', date: '2026/7/6', image: '/assets/reason-factory.jpg' }
];
const articles = computed(() => [videoNews, ...(Array.isArray(response.value?.data) ? response.value.data : []), ...fallbackNews].slice(0, 6));
useSeoMeta({ title: '新闻媒体', description: '瑞钧智科动态新闻与视频分享。' });

function startVideoPreview(event: MouseEvent) {
  const video = (event.currentTarget as HTMLElement).querySelector('video');
  if (!video) return;
  video.play().catch(() => undefined);
}

function stopVideoPreview(event: MouseEvent) {
  const video = (event.currentTarget as HTMLElement).querySelector('video');
  if (!video) return;
  video.pause();
  video.currentTime = 0;
}
</script>

<template>
  <NuxtPage v-if="route.path !== '/news'" />
  <main v-else class="news-page">
    <section class="news-hero">
      <SiteHeader />
      <video id="video-news" class="news-hero-video" :src="videoNews.video" autoplay muted loop playsinline preload="metadata"></video>
      <div class="hero-overlay"></div>
      <div class="hero-caption"><p>展示官方热门短视频、展会新闻</p><NuxtLink to="#video-share" class="hero-link">视频新闻</NuxtLink></div>
    </section>
    <section class="news-section" aria-labelledby="dynamic-news-title">
      <div class="section-heading"><h1 id="dynamic-news-title">动态新闻</h1></div>
      <div class="news-grid"><article v-for="article in articles" :key="String(article.slug || article.title)" class="news-card"><NuxtLink v-if="article.video" to="#video-news" class="card-image" @mouseenter="startVideoPreview" @mouseleave="stopVideoPreview"><video :src="String(article.video)" muted loop playsinline preload="metadata"></video></NuxtLink><NuxtLink v-else class="card-image" :to="article.slug ? `/news/${encodeURIComponent(String(article.slug))}` : '#dynamic-news-title'"><img :src="String(article.image || '/assets/docx-news.jpg')" :alt="String(article.title)"></NuxtLink><div class="card-copy"><p>{{ article.category || '动态新闻' }}</p><h2><NuxtLink :to="article.video ? '#video-news' : (article.slug ? `/news/${encodeURIComponent(String(article.slug))}` : '#dynamic-news-title')">{{ article.title }}</NuxtLink></h2><time>{{ new Date(String(article.published_at || '2026-05-12')).toLocaleDateString('zh-CN') }}</time></div></article></div>
      <div class="pagination"><button type="button">‹</button><span class="active">1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>……</span><span>20</span><button type="button">›</button></div>
    </section>
    <section id="video-share" class="news-section video-section" aria-labelledby="video-share-title"><div class="section-heading"><h1 id="video-share-title">视频分享</h1></div><div class="news-grid"><article v-for="item in videoShares" :key="item.title" class="news-card video-card"><NuxtLink class="card-image" :to="item.video ? '#video-news' : '#video-share'" @mouseenter="startVideoPreview" @mouseleave="stopVideoPreview"><video v-if="item.video" :src="item.video" muted loop playsinline preload="metadata"></video><img v-else :src="item.image" :alt="item.title"><span class="play-mark">▶</span></NuxtLink><div class="card-copy"><h2><NuxtLink :to="item.video ? '#video-news' : '#video-share'">{{ item.title }}</NuxtLink></h2><time>{{ item.date }}</time></div></article></div><div class="pagination"><button type="button">‹</button><span class="active">1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>……</span><span>20</span><button type="button">›</button></div></section>
  </main>
</template>

<style scoped>
.news-page { min-height: 100vh; background: #f1f1f1; color: #222; font-family: Arial, "Microsoft YaHei", sans-serif; }.news-hero { position: relative; height: min(48vw, 465px); min-height: 360px; overflow: hidden; background: #555; }.news-hero-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }.hero-overlay { position: absolute; inset: 0; background: rgb(28 30 31 / 28%); }.hero-caption { position: absolute; left: 9%; bottom: 11%; display: flex; align-items: center; gap: 28px; color: rgb(255 255 255 / 72%); }.hero-caption p { margin: 0; font-size: 16px; }.hero-link { padding: 12px 24px; color: #fff; background: #f52222; text-decoration: none; font-size: 17px; }.news-strip { height: 40px; background: #454545; color: #fff; }.strip-inner { width: min(1216px, calc(100% - 18%)); height: 100%; margin: 0 auto; display: flex; align-items: center; gap: 44px; }.strip-inner img { width: 62px; height: auto; }.news-section { width: min(1216px, calc(100% - 18%)); margin: 0 auto; padding: 44px 0 52px; }.section-heading h1 { margin: 0 0 20px; font-size: 19px; font-weight: 500; }.news-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px 22px; }.news-card { overflow: hidden; background: #fff; border: 1px solid #cfcfcf; }.card-image { position: relative; display: block; aspect-ratio: 1.78; overflow: hidden; background: #202020; }.card-image img, .card-image video { display: block; width: 100%; height: 100%; object-fit: cover; }.card-image::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgb(0 0 0 / 8%), rgb(0 0 0 / 58%)); }.card-copy { position: relative; padding: 10px 13px 13px; }.card-copy p { position: absolute; left: 13px; top: -34px; margin: 0; color: #fff; font-size: 13px; font-weight: 700; }.card-copy h2 { margin: 0 0 8px; min-height: 38px; font-size: 16px; line-height: 1.3; font-weight: 600; }.card-copy h2 a { color: #222; text-decoration: none; }.card-copy time { color: #777; font-size: 12px; }.pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 34px; font-size: 21px; }.pagination button { width: 26px; height: 26px; padding: 0; border: 0; border-radius: 4px; color: #fff; background: #f52222; font-size: 25px; line-height: 20px; }.pagination .active { color: #f52222; }.video-section { padding-top: 48px; padding-bottom: 72px; }.video-card .card-copy h2 { min-height: 22px; }.play-mark { position: absolute; z-index: 1; inset: 50% auto auto 50%; width: 46px; height: 46px; transform: translate(-50%, -50%); display: grid; place-items: center; border: 2px solid #fff; border-radius: 50%; color: #fff; font-size: 21px; }@media (max-width: 760px) { .news-hero { height: 65svh; min-height: 400px; }.hero-caption { left: 22px; right: 22px; bottom: 32px; align-items: flex-start; flex-direction: column; gap: 14px; }.strip-inner, .news-section { width: auto; margin: 0 22px; }.news-grid { grid-template-columns: 1fr; }.pagination { gap: 11px; font-size: 18px; } }
/* Each news mode occupies its own viewport; the former title strips are intentionally absent. */
.news-page { scroll-snap-type: y proximity; }
.news-hero, .news-section { scroll-snap-align: start; }
.news-hero { height: 100svh; min-height: 560px; }
.news-section { box-sizing: border-box; min-height: 100svh; padding-top: clamp(72px, 10vh, 120px); padding-bottom: 52px; display: flex; flex-direction: column; justify-content: center; }
.video-section { padding-top: clamp(72px, 10vh, 120px); }
@media (max-width: 760px) {
  .news-page { scroll-snap-type: none; }
  .news-hero { height: 100svh; min-height: 500px; }
  .news-section { min-height: 100svh; padding-top: 82px; justify-content: flex-start; }
}
</style>
