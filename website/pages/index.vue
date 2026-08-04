<script setup lang="ts">
import { getHeroState } from '~/shared/home-hero-state.mjs';
import { resolvePageSection } from '~/shared/page-sections.mjs';
import '~/assets/page-content.css';

const { data: page } = await useFetch('/api/public/v1/pages/home', {
  default: () => ({ data: null, source: 'static', cache: 'unavailable' })
});

const pageContent = computed(() => page.value?.data || null);
const heading = computed(() => pageContent.value?.title || '瑞钧智科中走丝线切割机床');
const reasonsHeading = computed(() => resolvePageSection(pageContent.value, 'why-ruijun', { title: '选择瑞钧的\n三大理由' }));
const reasonsHeadingLines = computed(() => String(reasonsHeading.value.title || '').split('\n').filter(Boolean));
const reasonFallbacks = [
  { id: 'performance', title: '产品效率性能提升50%', shortTitle: '效率提升', introTitle: '效率提升', introDetail: '产品效率性能提升50%', image: '/assets/psd/reason-efficiency-machine.png', icon: '/assets/psd/reason-tab-efficiency.png', mode: 'machine' },
  { id: 'advanced-manufacturing', title: '30年技术沉淀，先进制造工厂', shortTitle: '先进智造', introTitle: '先进智造', introDetail: '30年技术沉淀，先进制造工厂', image: '/assets/psd/reason-factory-full.jpg', icon: '/assets/psd/reason-tab-manufacturing.png', mode: 'photo' },
  { id: 'industry-leadership', title: '产品销量稳居全国第一', shortTitle: '领军品牌', introTitle: '行业领军品牌', introDetail: '产品销量稳居全国第一（数据来源电加工协会）', image: '/assets/psd/reason-market-full.jpg', icon: '/assets/psd/reason-tab-leadership.png', mode: 'photo' }
];
const reasons = computed(() => reasonFallbacks.map((fallback) => ({ ...fallback, ...resolvePageSection(pageContent.value, fallback.id, fallback) })));
const products = [
  { id: 'workstation', name: '灵动切割工作站', series: '无人化加工系列', image: '/assets/psd/product-workstation.png' },
  { id: 'fr-xs-auto', name: 'FR-XS (AUTO)', series: '自动穿丝系列', image: '/assets/psd/product-auto.png' },
  { id: 'fr-xs-pro', name: 'FR-XS (PRO)', series: '高速切割系列', image: '/assets/psd/product-pro.png' },
  { id: 'ft-xs', name: 'FT-XS', series: '一体机系列', image: '/assets/psd/product-ft-xs.png' },
  { id: 'fr-y', name: 'FR-Y', series: '大摇摆系列', image: '/assets/psd/product-fr-y.png' },
  { id: 'fl-xs', name: 'FL-XS', series: '超大型系列', image: '/assets/psd/product-fl-xs.png' }
];
const milestones = [
  ['1997', '成立丰华数控', '公司始创'], ['2003', '创新中走丝', '初代研发'], ['2006', '成立瑞钧机械', '迁址昆山'],
  ['2014', '启用新建厂房', '规模化生产'], ['2016', '扩建流水线车间', '标准化生产'], ['2025', '启用瑞钧智科', '智能制造']
];

const HERO_VIDEO_FADE_LEAD_SECONDS = .65;
const HERO_VIDEO_CROSSFADE_MS = 680;
const videoCompleted = ref(false);
const videoFailed = ref(false);
const videoFading = ref(false);
const heroVideo = ref<HTMLVideoElement>();
let heroFadeTimer: ReturnType<typeof setTimeout> | undefined;
const heroState = computed(() => getHeroState(videoCompleted.value, videoFailed.value));
const inquiryOpen = ref(false);
const openInquiry = () => { inquiryOpen.value = true; };

function finishHeroVideo(crossfade = true) {
  if (videoCompleted.value || videoFailed.value) return;
  if (!crossfade) {
    videoCompleted.value = true;
    return;
  }

  videoFading.value = true;
  videoCompleted.value = true;
  heroVideo.value?.pause();
  if (heroFadeTimer) clearTimeout(heroFadeTimer);
  heroFadeTimer = setTimeout(() => { videoFading.value = false; }, HERO_VIDEO_CROSSFADE_MS);
}

function handleHeroVideoProgress(event: Event) {
  const video = event.currentTarget as HTMLVideoElement;
  if (Number.isFinite(video.duration) && video.currentTime >= video.duration - HERO_VIDEO_FADE_LEAD_SECONDS) finishHeroVideo();
}

function handleHeroVideoError() {
  videoFading.value = false;
  videoFailed.value = true;
}

onMounted(() => {
  watch(() => heroState.value.stageVisible, ready => { if (ready) window.dispatchEvent(new Event('ruijun:hero-ready')); }, { immediate: true });
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) handleHeroVideoError();
});
onBeforeUnmount(() => { if (heroFadeTimer) clearTimeout(heroFadeTimer); });
useHead({ title: '中走丝线切割机床' });
</script>

<template>
  <main class="home-page">
    <SiteHeader />
    <HomeImmersiveMotion @hero-ended="finishHeroVideo(false)" />
    <section id="home" class="hero lifecycle-panel" :class="{ 'hero-ended': heroState.stageVisible }" data-panel-label="首页" aria-labelledby="hero-title">
      <video v-if="heroState.videoVisible || videoFading" ref="heroVideo" class="hero-video" :class="{ 'is-fading': videoFading }" autoplay muted playsinline @timeupdate="handleHeroVideoProgress" @ended="finishHeroVideo()" @error="handleHeroVideoError"><source src="/assets/hero.mp4" type="video/mp4"></video>
      <img class="hero-static-machine" src="/assets/psd/hero-machine.png" alt="瑞钧中走丝线切割机床">
      <h1 id="hero-title" class="sr-only">{{ heading }}</h1>
      <a class="hero-ended-link" href="#reasons" aria-label="了解更多"></a>
    </section>

    <section id="reasons" class="reason-intro lifecycle-panel" data-panel-label="选择瑞钧" aria-labelledby="reasons-title">
      <div class="intro-machine-wrap" aria-hidden="true"><div class="intro-machine-glow"></div><img src="/assets/psd/hero-machine.png" alt=""></div>
      <div class="intro-copy"><h2 id="reasons-title">{{ reasonsHeadingLines[0] }}<span v-if="reasonsHeadingLines[1]">{{ reasonsHeadingLines.slice(1).join(' ') }}</span></h2><ol class="reason-list"><li v-for="reason in reasons" :key="reason.id"><b>{{ reason.introTitle }}</b><span>{{ reason.introDetail }}</span></li></ol></div>
    </section>

    <section id="reason-showcase" class="reason-showcase lifecycle-panel" data-panel-label="三大理由" aria-label="选择瑞钧的三大理由">
      <div class="reason-horizontal-track">
        <article v-for="(reason, index) in reasons" :id="index === 0 ? 'reason-performance' : index === 1 ? 'reason-manufacturing' : 'reason-leadership'" :key="reason.id" class="reason-scene" :class="reason.mode === 'machine' ? 'reason-performance' : 'photo-scene'" :data-reason-slide="index">
          <img v-if="reason.mode === 'photo'" class="scene-photo" :src="reason.image" :alt="reason.shortTitle">
          <div v-if="reason.mode === 'photo'" class="scene-shade" :class="{ 'scene-shade-strong': index === 2 }"></div>
          <div class="reason-tabs" aria-label="三大理由"><a v-for="(tab, tabIndex) in reasons" :key="tab.id" :href="tabIndex === 0 ? '#reason-performance' : tabIndex === 1 ? '#reason-manufacturing' : '#reason-leadership'" :class="{ active: tabIndex === index }"><img class="reason-tab-icon" :src="tab.icon" alt=""><span class="reason-tab-label">{{ tab.shortTitle }}</span></a></div>
          <div :class="reason.mode === 'machine' ? 'performance-content' : ['photo-copy', { 'photo-copy-center': index === 2 }]"><h2>{{ reason.title }}</h2></div>
          <img v-if="reason.mode === 'machine'" class="performance-machine" :src="reason.image" alt="瑞钧中走丝线切割机床">
        </article>
      </div>
      <div class="reason-progress" aria-hidden="true"><i></i><i></i><i></i></div>
    </section>

    <section id="products" class="products lifecycle-panel" data-panel-label="产品中心" aria-labelledby="products-title">
      <div class="product-shell">
        <div class="product-heading">
          <div class="product-heading-title"><h2 id="products-title"><span>我们的</span><em>产品</em></h2></div>
          <p>面向自动化、精密加工、大锥度与大型工件等不同生产任务。</p>
        </div>
        <div class="product-grid">
          <NuxtLink v-for="(product, index) in products" :key="product.id" to="/product" class="product-card">
            <img :src="product.image" :alt="`${product.name} 设备`">
            <div><small>{{ index + 1 }} / {{ product.series }}</small><h3>{{ product.name }}</h3></div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section id="history" class="history lifecycle-panel" data-panel-label="发展历程" aria-labelledby="history-title">
      <div class="history-copy"><p id="history-title" class="history-en"><span>The Development</span><span>History of Ruijun.</span><span>Zhike's Mid Speed</span><span>Wire Manufacturing</span></p><p class="history-cn">瑞钧智科的中走丝制造历史</p></div>
      <div class="history-viewport"><div class="history-track"><article v-for="milestone in milestones" :key="milestone[0]" class="history-event"><b>{{ milestone[0] }}</b><span>{{ milestone[1] }}<br>（{{ milestone[2] }}）</span></article></div></div>
      <i class="history-wheel-cursor" aria-hidden="true"><img class="history-wheel" src="/assets/about-psd/history-guide-wheel.png" alt=""></i><div class="history-orbit" aria-hidden="true"><i class="history-orbit-ring"></i><i class="history-cursor"></i></div><div class="history-progress" aria-hidden="true"><i></i><i></i><i></i></div><p class="history-hint">SCROLL TO EXPLORE <span>→</span></p>
    </section>

    <section id="contact" class="contact-panel lifecycle-panel" data-panel-label="联系瑞钧"><div class="contact-hero"><p>RUIJUN MEDIUM SPEED WIRE EDM</p><h2>让下一台设备<br>匹配你的加工任务</h2><button type="button" @click="openInquiry">获取选型建议 <span aria-hidden="true">→</span></button></div><SiteFooter variant="full" /></section>
    <LeadInquiryDialog v-model:open="inquiryOpen" />
  </main>
</template>

<style scoped>
.home-page{min-height:100vh;overflow:hidden;background:#080808;color:#fff}.hero{position:relative;height:100svh;overflow:hidden;background:#050506}.hero-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.hero-stage{position:absolute;inset:0;background:#050506 url('/assets/psd/hero-stage.jpg') center/cover no-repeat}.hero-stage img{position:absolute;top:23.5%;left:14.5%;width:min(40.5vw,610px);max-width:none;filter:drop-shadow(0 25px 34px rgb(0 0 0/32%))}.hero-next{position:absolute;z-index:4;right:7%;bottom:7%;width:42px;height:42px;border:1px solid rgb(255 255 255/55%);border-radius:50%}.hero-next::after{content:"↓";position:absolute;inset:0;display:grid;place-items:center;color:#fff}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.reason-intro{position:relative;min-height:100svh;display:grid;grid-template-columns:48% 52%;align-items:center;padding:105px max(6vw,calc((100vw - var(--ruijun-max))/2));overflow:hidden;background:#f3f3f1;color:#131313}.intro-machine-stage{position:relative;width:min(520px,39vw);aspect-ratio:1;display:grid;place-items:center;overflow:hidden;background:#0b0b0c;border-radius:5px}.intro-machine-stage span{position:absolute;inset:18%;background:rgb(255 255 255/15%);filter:blur(70px)}.intro-machine{position:relative;width:94%;max-height:92%;object-fit:contain}.intro-copy{padding-left:8vw}.intro-copy>p,.product-heading>div>p,.contact-panel>div>p{margin:0;color:var(--ruijun-red);font-size:12px}.intro-copy h2{max-width:570px;margin:16px 0 38px;white-space:pre-line;font-size:clamp(48px,6vw,82px);line-height:1.04;font-weight:500}.intro-copy h2::first-line{color:#161719}.intro-copy ol{max-width:560px;margin:0;padding:0;list-style:none}.intro-copy li{display:grid;grid-template-columns:38px 1fr;gap:12px;padding:13px 0;border-top:1px solid rgb(19 19 19/20%)}.intro-copy li>b{color:var(--ruijun-red);font-size:10px}.intro-copy li div{display:grid;grid-template-columns:145px 1fr;gap:18px}.intro-copy strong{font-size:17px}.intro-copy li span{color:#74777b;font-size:12px}
.reason-showcase{position:relative;height:100svh;overflow:hidden;background:#09090a}.reason-card{position:absolute;inset:0;overflow:hidden;color:#fff;background:#09090a;clip-path:inset(0 0 0 100%)}.reason-card:first-child{clip-path:inset(0)}.reason-card>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.reason-machine>img{inset:auto 12% 10% auto;width:25vw;max-width:360px;height:auto;max-height:50vh;object-fit:contain}.scene-shade{position:absolute;inset:0;background:rgb(3 8 11/52%)}.reason-card nav{position:absolute;z-index:3;top:84px;right:7%;left:7%;display:grid;grid-template-columns:repeat(3,1fr)}.reason-card nav span{padding:15px 0;color:rgb(255 255 255/36%);border-bottom:1px solid rgb(255 255 255/18%);font-size:16px;font-weight:600}.reason-card nav span.active{color:#fff;border-color:var(--ruijun-red)}.reason-card nav b{margin-right:10px;color:var(--ruijun-red);font-size:9px}.reason-copy{position:absolute;z-index:3;top:48%;left:11%;max-width:680px;transform:translateY(-50%)}.reason-photo .reason-copy{left:50%;width:min(980px,86vw);max-width:none;transform:translate(-50%,-50%);text-align:center}.reason-copy p{margin:0 0 20px;color:#fff;font-size:12px}.reason-copy h2{margin:0 0 24px;color:var(--ruijun-red);white-space:pre-line;font-size:clamp(48px,5vw,76px);line-height:1.08;font-weight:500}.reason-photo .reason-copy h2{color:#fff}.reason-copy>span{display:block;max-width:680px;color:rgb(255 255 255/76%);font-size:16px;line-height:1.8}.reason-photo .reason-copy>span{margin:0 auto}.reason-copy small{display:block;margin-top:22px;color:rgb(255 255 255/45%);font-size:11px}
.products{min-height:100svh;display:flex;align-items:center;padding:98px 6.2% 54px;background:var(--ruijun-paper);color:var(--ruijun-ink)}.product-shell{width:min(var(--ruijun-max),100%);margin:0 auto}.product-heading{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:26px}.product-heading h2{margin:0;font-size:38px;line-height:1;font-weight:600}.product-heading h2 span{margin-left:6px;color:var(--ruijun-red);font-size:17px;font-weight:500}.product-heading>p{max-width:430px;margin:0;color:var(--ruijun-muted);font-size:13px}.product-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.product-card{position:relative;min-width:0;aspect-ratio:1.63;overflow:hidden;background:#e5eaec;border-radius:4px;text-decoration:none;transition:transform .25s ease,box-shadow .25s ease}.product-card:hover{transform:translateY(-4px);box-shadow:0 14px 30px rgb(20 28 34/13%)}.product-card img{width:100%;height:100%;object-fit:cover}.product-card>div{position:absolute;right:0;bottom:14%;min-width:37%;padding:10px 13px;color:#fff;background:rgb(48 52 55/78%)}.product-card small{display:block;color:rgb(255 255 255/70%);font-size:8px}.product-card h3{margin:2px 0 0;font-size:16px;font-weight:600}
.history{position:relative;height:100svh;min-height:660px;overflow:hidden;color:#444649;background:#f3f2ee}.history::before{content:"";position:absolute;inset:12px;border:1px solid rgb(255 255 255/70%);box-shadow:inset 0 0 110px rgb(119 113 103/8%)}.history-copy{position:absolute;z-index:4;top:24%;right:6.2%;width:45%}.history-copy p{display:grid;row-gap:10px;margin:0;font-size:clamp(48px,5vw,72px);line-height:1.08;font-weight:600}.history-copy p span{color:rgb(61 63 66/20%)}.history-copy small{display:block;margin-top:24px;color:#77797c;font-size:16px}.history-viewport{position:absolute;z-index:2;inset:100px 0 50px;overflow:hidden}.history-track{position:relative;width:3000px;height:100%}.history-track article{position:absolute;width:280px}.history-track article:nth-child(1){top:10%;left:220px}.history-track article:nth-child(2){top:57%;left:700px}.history-track article:nth-child(3){top:18%;left:1180px}.history-track article:nth-child(4){top:62%;left:1660px}.history-track article:nth-child(5){top:12%;left:2140px}.history-track article:nth-child(6){top:55%;left:2620px}.history-track b{display:block;color:var(--ruijun-red);font-size:90px;line-height:1;font-weight:700}.history-track strong,.history-track span{display:block;color:#24262a;font-size:22px}.history>i{position:absolute;z-index:6;top:calc(50% + 20px);left:18%;width:44px;height:13px;background:var(--ruijun-red)}.history>i::after{content:"";position:absolute;top:-11px;right:-25px;border-top:18px solid transparent;border-bottom:18px solid transparent;border-left:26px solid var(--ruijun-red)}.history-hint{position:absolute;z-index:5;bottom:27px;left:6.2%;margin:0;color:#999b9e;font-size:9px}.history-hint span{margin-left:10px;color:var(--ruijun-red);font-size:18px}
.contact-panel{color:#fff;background:#0b0b0c}.contact-panel>div{min-height:42svh;padding:9vh 7% 5vh;background:#131416}.contact-panel h2{margin:8px 0 26px;font-size:42px;line-height:1.2;font-weight:500}.contact-panel button{min-height:44px;padding:0 18px;color:#fff;background:var(--ruijun-red);border:0;border-radius:2px;font-size:12px;font-weight:600;cursor:pointer}
@media(max-width:760px){.home-page{overflow:visible}.hero{height:calc(100svh - 58px)}.hero-stage img{top:28%;left:-7%;width:98vw}.hero-next{right:20px;bottom:20px}.reason-intro{min-height:auto;display:block;padding:52px 20px 62px}.intro-machine-stage{width:100%;aspect-ratio:1.12;margin-bottom:34px}.intro-copy{padding:0}.intro-copy h2{margin:10px 0 26px;font-size:42px}.intro-copy li div{grid-template-columns:1fr;gap:3px}.intro-copy li span{font-size:11px}.reason-showcase{height:auto}.reason-card{position:relative;min-height:78svh;clip-path:none!important}.reason-card+article{border-top:1px solid rgb(255 255 255/20%)}.reason-card nav{top:26px;right:20px;left:20px}.reason-card nav span{font-size:10px}.reason-card nav b{display:block;margin:0 0 5px}.reason-copy,.reason-photo .reason-copy{top:auto;right:20px;bottom:8%;left:20px;width:auto;transform:none;text-align:left}.reason-copy h2{font-size:38px}.reason-copy>span,.reason-photo .reason-copy>span{margin:0;font-size:13px}.reason-machine>img{right:9%;bottom:26%;width:50vw;max-height:38vh}.products{min-height:auto;padding:62px 20px}.product-heading{display:block}.product-heading>p{margin-top:18px}.product-grid{grid-template-columns:1fr}.history{height:auto;min-height:0;padding:72px 20px}.history::before{inset:4px}.history-copy{position:relative;top:auto;right:auto;width:auto}.history-copy p{font-size:31px}.history-viewport{position:relative;inset:auto;margin-top:58px;overflow-x:auto}.history-track{display:flex;gap:50px;width:max-content;height:auto;padding:0 40px 15px 0;transform:none!important}.history-track article,.history-track article:nth-child(n){position:static;width:220px}.history-track b{font-size:54px}.history-track strong,.history-track span{font-size:16px}.history>i{display:none}.history-hint{position:static;margin-top:30px}.contact-panel>div{min-height:340px;padding:70px 20px}.contact-panel h2{font-size:34px}}
@media (max-width: 720px) { .reason-intro { min-height: auto; } }
@media(prefers-reduced-motion:reduce){.intro-copy,.intro-copy li{opacity:1!important;transform:none!important}.reason-card{clip-path:none!important}.reason-showcase{height:auto}.reason-card{position:relative;min-height:80svh}.history-track,.history-copy,.history>i{transform:none!important}}

/* Legacy visual baseline: these selectors match the pre-Nuxt immersive chapters. */
.lifecycle-panel{position:relative;min-height:100svh;overflow:hidden}
.hero{height:100svh;background:#050506}
.hero-video{position:absolute;z-index:2;inset:0;width:100%;height:100%;object-fit:cover;opacity:1;transition:opacity .68s cubic-bezier(.22,.8,.24,1)}
.hero-video.is-fading{opacity:0;pointer-events:none}
.hero-ended{background:#050506 url('/assets/psd/hero-stage.jpg') center/cover no-repeat}
.hero-static-machine{position:absolute;z-index:3;top:23.5%;left:14.5%;display:block;width:min(40.5vw,610px);max-width:none;object-fit:contain;opacity:0;filter:drop-shadow(0 25px 34px rgb(0 0 0/32%));transition:opacity .68s cubic-bezier(.22,.8,.24,1)}
.hero-ended .hero-static-machine{opacity:1}
.hero-static-machine.is-morph-hidden{opacity:0}
.hero-ended-link{display:none;position:absolute;z-index:3;top:58.4%;right:16.9%;width:220px;height:50px}
.hero-ended .hero-ended-link{display:block}
.reason-intro{display:grid;grid-template-columns:48% 52%;align-items:center;padding:105px max(6vw,calc((100vw - var(--ruijun-max))/2));background:#f3f3f1;color:#131313}
.intro-machine-wrap{position:relative;width:min(520px,39vw);aspect-ratio:1;display:grid;place-items:center;overflow:hidden;background:#0b0b0c;border-radius:5px}
.intro-machine-glow{position:absolute;inset:18%;background:rgb(255 255 255/15%);filter:blur(70px)}
.intro-machine-wrap img{position:relative;width:88%;max-height:87%;object-fit:contain;transition:opacity .18s ease}
.intro-machine-wrap img.is-morph-hidden{opacity:0}
.intro-machine-wrap.is-stage-morph-hidden{visibility:hidden}
.intro-copy{padding-left:7%}
.intro-copy .section-kicker{margin:0 0 12px;color:var(--ruijun-red);font-size:12px}
.intro-copy h2{max-width:none;margin:0 0 42px;white-space:normal;font-size:48px;line-height:1.18;font-weight:500}
.intro-copy h2 span{margin-left:8px;color:var(--ruijun-red)}
.reason-list{max-width:none!important;margin:0;padding:0;list-style:none}
.intro-copy .section-kicker,.intro-copy h2,.reason-list li{opacity:0;transform:translateY(24px);transition:opacity .62s ease,transform .72s cubic-bezier(.22,.8,.24,1)}
.reason-intro.intro-heading-visible .intro-copy .section-kicker,.reason-intro.intro-heading-visible .intro-copy h2{opacity:1;transform:translateY(0)}
.reason-list li{display:grid!important;grid-template-columns:138px 1fr!important;gap:20px!important;align-items:baseline;margin-bottom:26px;padding:0!important;border:0!important}
.reason-intro.intro-stage-1 .reason-list li:nth-child(1),.reason-intro.intro-stage-2 .reason-list li:nth-child(-n+2),.reason-intro.intro-stage-3 .reason-list li{opacity:1;transform:translateY(0)}
.reason-list b{color:var(--ruijun-red)!important;font-size:22px!important}
.reason-list li>span{color:#37383b!important;font-size:16px!important}
.reason-list small{display:block;margin-top:3px;color:#999b9e;font-size:10px}
.section-next{position:absolute;right:6.2%;bottom:28px;display:flex;align-items:center;gap:10px;color:#838589;font-size:10px;opacity:0!important;pointer-events:none;transition:opacity .45s ease}
.reason-intro.intro-stage-3 .section-next{opacity:1!important;pointer-events:auto}
.section-next i{width:8px;height:8px;border-right:1px solid var(--ruijun-red);border-bottom:1px solid var(--ruijun-red);transform:rotate(45deg) translateY(-3px)}
.reason-showcase{height:100svh;background:#09090a}
.reason-horizontal-track{position:relative;width:100%;height:100%}
.reason-scene{position:relative;width:100vw;height:100svh;flex:0 0 100vw;overflow:hidden;color:#fff;background:#09090a}
.reason-tabs{position:absolute;z-index:4;top:13.5%;left:50%;width:min(1240px,88vw);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:30px;transform:translateX(-50%);will-change:transform}
.reason-tabs a{position:relative;display:flex;align-items:baseline;justify-content:center;gap:12px;min-width:0;padding:16px 8px 22px;color:rgb(255 255 255/25%);border-bottom:1px solid rgb(255 255 255/18%);text-align:center;white-space:nowrap;text-decoration:none;font-size:34px;font-weight:700;line-height:1.15;transition:color .35s ease}
.reason-tabs a::after{content:"";position:absolute;right:50%;bottom:-1px;left:50%;height:3px;background:var(--ruijun-red);transition:right .35s ease,left .35s ease}
.reason-tabs a.active{color:#fff}.reason-tabs a.active::after{right:0;left:0}.reason-tabs span{color:var(--ruijun-red);font-size:11px;font-weight:600}
.reason-progress{position:absolute;z-index:8;right:28px;bottom:28px;display:none;gap:7px}.reason-progress i{width:26px;height:2px;background:rgb(255 255 255/30%)}.reason-progress i.active{width:46px;background:var(--ruijun-red)}
.performance-content{position:absolute;z-index:3;top:45%;left:11%;transform:translateY(-50%);will-change:transform,opacity}.reason-scene .section-kicker{margin:0 0 22px;font-size:13px}.performance-content h2{margin:0 0 24px;color:var(--ruijun-red);white-space:pre-line;font-size:68px;font-weight:500;line-height:1.08}.performance-content>p{max-width:560px;color:#b8b9bc;font-size:16px;line-height:1.8}.data-note{display:block;margin-top:22px;color:rgb(255 255 255/45%);font-size:11px}
.performance-machine{position:absolute;right:12%;bottom:12%;width:25vw;max-width:360px;max-height:50vh;object-fit:contain}.scene-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;will-change:transform}.scene-shade{position:absolute;inset:0;background:rgb(3 8 11/48%)}.scene-shade-strong{background:rgb(4 6 8/56%)}
.photo-copy{position:absolute;z-index:3;top:51%;left:50%;width:min(980px,86vw);transform:translate(-50%,-50%);text-align:center;will-change:transform,opacity}.photo-copy h2{margin:0 0 26px;white-space:pre-line;font-size:68px;line-height:1.14;font-weight:600}.photo-copy>p{max-width:680px;margin:0 auto;color:rgb(255 255 255/78%);font-size:17px;line-height:1.8}.photo-copy-center h2{font-size:76px}
.history-copy{padding:18px 0 20px}.history-en{position:relative;z-index:1;display:grid!important;row-gap:clamp(10px,.75vw,14px)!important;margin:0;font-size:72px!important;line-height:1.08!important;font-weight:600}.history-en span{position:relative;display:block;width:max-content;max-width:100%;color:transparent!important;background:linear-gradient(90deg,#25272a 0 var(--reveal-progress,0%),rgb(61 63 66/20%) var(--reveal-progress,0%) 100%);background-clip:text;white-space:nowrap}.history-cn{position:relative;z-index:1;margin:24px 0 0!important;color:#77797c;font-size:22px!important}.history-event b{width:max-content;color:transparent!important;background:linear-gradient(90deg,var(--ruijun-red),#f29aa0);background-clip:text}.history-progress{position:absolute;z-index:5;right:6.2%;bottom:38px;display:none;gap:7px}.history-progress i{width:26px;height:2px;background:#bbbcb9}.history-progress i.active{width:48px;background:var(--ruijun-red)}
.history>.history-wheel-cursor{--history-wheel-size:clamp(64px,4.8vw,82px);position:absolute;z-index:4;top:calc(50% + 20px - var(--history-wheel-size) / 2);left:18%;display:block;width:var(--history-wheel-size);height:var(--history-wheel-size);background:transparent;pointer-events:none;will-change:transform}.history>.history-wheel-cursor::before{content:"";position:absolute;z-index:0;top:0;right:50%;width:var(--wire-length,0px);height:3px;background:repeating-linear-gradient(90deg,#aaa7a7 0 14px,transparent 14px 24px);transform:translateY(-50%);pointer-events:none}.history>.history-wheel-cursor::after{display:none}.history-wheel{position:relative;z-index:1;display:block;width:100%;height:100%;object-fit:contain;will-change:transform}.history-orbit{position:absolute;z-index:5;bottom:-1px;left:50%;width:clamp(640px,50vw,920px);height:clamp(150px,12vw,210px);overflow:visible;transform:translateX(-50%);pointer-events:none}.history-orbit-ring{position:absolute;top:0;left:0;display:block;width:100%;aspect-ratio:1;border:3px dotted var(--ruijun-red);border-radius:50%;transform-origin:50% 50%;will-change:transform}.history-orbit .history-cursor{position:absolute;z-index:6;top:-6px;left:calc(50% - 35px);display:block;width:44px;height:13px;background:var(--ruijun-red);will-change:transform}.history-orbit .history-cursor::after{content:"";position:absolute;top:-11px;right:-25px;border-top:18px solid transparent;border-bottom:18px solid transparent;border-left:26px solid var(--ruijun-red)}
.contact-panel{display:grid;grid-template-rows:42% 58%;min-height:100svh}.contact-panel>.contact-hero{min-height:0;padding:9vh 7% 5vh}
@media(min-width:901px){:global(html){scroll-behavior:auto;scrollbar-width:none}:global(html::-webkit-scrollbar){width:0;height:0}.lifecycle-panel{height:100svh}.lifecycle-panel>*{transition:opacity .55s ease,transform .7s cubic-bezier(.22,.8,.24,1)}.reason-showcase>.reason-horizontal-track{transition:none}.reason-scene{position:absolute;inset:0;flex:none;will-change:transform;box-shadow:-12px 0 34px rgb(0 0 0/18%)}.reason-scene:nth-child(1){z-index:1}.reason-scene:nth-child(2){z-index:2;transform:translateX(100%)}.reason-scene:nth-child(3){z-index:3;transform:translateX(100%)}.lifecycle-panel.is-after>*:not(.reason-horizontal-track){opacity:.55;transform:translateY(18px)}.lifecycle-panel.is-active>*{opacity:1}}
@media(min-width:901px) and (max-width:1600px){.history-en{font-size:52px!important}.history-event b{font-size:72px}.history-event span{font-size:18px}}
@media(max-width:1050px){.reason-tabs{width:90vw;gap:18px}.reason-tabs a{gap:8px;font-size:24px}.intro-copy h2{font-size:40px}.performance-content h2,.photo-copy h2{font-size:54px}.photo-copy-center h2{font-size:58px}}
@media(max-width:900px){.hero{min-height:650px;height:calc(100svh - 58px)}.hero-ended{background-image:url('/assets/hero.jpg')}.hero-ended .hero-static-machine{display:none}.hero-ended-link{top:auto;right:10%;bottom:16%;width:80%;height:52px}.reason-intro{min-height:auto;padding:100px 6% 70px;grid-template-columns:1fr;gap:36px}.intro-machine-wrap{width:100%;max-width:520px;margin:0 auto}.intro-copy{padding-left:0}.intro-copy .section-kicker,.intro-copy h2,.reason-list li{opacity:1;transform:none}.intro-copy h2{margin-bottom:30px;font-size:34px}.reason-list li{grid-template-columns:116px 1fr!important;gap:12px!important;margin-bottom:19px}.reason-list b{font-size:18px!important}.reason-list li>span{font-size:14px!important}.section-next{display:none}.reason-showcase{height:100svh;min-height:650px}.reason-horizontal-track{display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none}.reason-horizontal-track::-webkit-scrollbar{display:none}.reason-scene{position:relative;inset:auto;width:100vw;height:100svh;min-height:650px;flex:0 0 100vw;scroll-snap-align:start;transform:none!important;box-shadow:none}.reason-tabs{top:12%;width:88vw;gap:0}.reason-tabs a{gap:0;padding:12px 4px 15px;font-size:12px}.reason-tabs span{display:none}.performance-content{top:24%;right:7%;left:7%;transform:none}.performance-content h2{font-size:34px}.performance-machine{right:6%;bottom:3%;width:46vw;max-height:34vh}.photo-copy{width:86vw}.photo-copy h2,.photo-copy-center h2{font-size:34px}.products{min-height:auto}.history{min-height:720px;height:100svh;padding:0}.history-copy{position:absolute;top:92px;right:6%;left:6%;width:auto;padding:0}.history-en{row-gap:0!important;font-size:19px!important;line-height:1.35!important}.history-en span{width:auto;color:#3d3f42!important;background:none;white-space:normal}.history-cn{margin-top:13px!important;font-size:15px!important}.history-viewport{position:absolute;top:245px;right:0;bottom:58px;left:0;margin:0;overflow-x:auto;overflow-y:hidden;opacity:1!important;visibility:visible!important;scroll-snap-type:x proximity}.history-track{display:block;width:1840px;height:100%;padding:0;transform:none!important}.history-event,.history-event:nth-child(n){position:absolute;width:190px}.history-event:nth-of-type(1){top:7%;left:45px}.history-event:nth-of-type(2){top:55%;left:325px}.history-event:nth-of-type(3){top:14%;left:605px}.history-event:nth-of-type(4){top:60%;left:885px}.history-event:nth-of-type(5){top:9%;left:1165px}.history-event:nth-of-type(6){top:52%;left:1445px}.history-event b{font-size:42px}.history-event span{font-size:14px}.history-cursor,.history-progress{display:none}.history-hint{position:absolute;bottom:18px}.contact-panel{min-height:auto;grid-template-rows:auto auto}.contact-panel>.contact-hero{min-height:0;padding:100px 7% 60px}}
@media(prefers-reduced-motion:reduce){.intro-copy .section-kicker,.intro-copy h2,.reason-list li{opacity:1!important;transform:none!important}.reason-scene{transform:none!important}.reason-horizontal-track{display:flex;overflow-x:auto}.history-track,.history-copy,.history-cursor{transform:none!important}}

/* PSD typography baseline. Layout and motion selectors remain unchanged. */
.home-page{font-family:var(--ruijun-font-cn)}
.intro-copy h2{font-size:clamp(44px,3.04vw,58px);line-height:1.12;font-weight:500}
.reason-list li{grid-template-columns:clamp(138px,10vw,192px) 1fr!important;gap:clamp(18px,1.55vw,30px)!important;margin-bottom:clamp(24px,2.1vh,34px)}
.reason-list b{font-size:clamp(26px,2.3vw,44px)!important;line-height:1.12;font-weight:500}
.reason-list li>span{font-size:clamp(17px,1.52vw,29px)!important;line-height:1.48}
.reason-list small{font-size:11px;line-height:1.5}
.reason-tabs a{font-size:clamp(24px,1.52vw,29px);font-weight:500}
.performance-content h2{font-size:clamp(54px,3.8vw,73px);font-weight:500}
.photo-copy h2,.photo-copy-center h2{font-size:clamp(48px,3.04vw,58px);font-weight:500}
.product-heading-title{display:flex;align-items:baseline;gap:26px}
.product-heading .product-heading-title>p{margin:0;color:#24262a;font-family:var(--ruijun-font-latin);font-size:clamp(44px,3.04vw,58px);font-weight:300;line-height:1}
.product-heading-title h2{color:var(--ruijun-red);font-size:clamp(24px,2.03vw,39px);font-weight:400}
.history-en{font-family:var(--ruijun-font-latin);font-size:clamp(48px,3.04vw,58px)!important;font-weight:300}
.history-event b{font-family:var(--ruijun-font-latin);font-size:clamp(48px,3.04vw,58px);font-weight:300}
.history-event span{font-size:clamp(17px,1.15vw,22px);font-weight:400}
@media(max-width:900px){.intro-copy h2{font-size:36px}.reason-list li{grid-template-columns:112px 1fr!important}.reason-list b{font-size:20px!important}.reason-list li>span{font-size:14px!important}.reason-tabs a{font-size:12px}.performance-content h2,.photo-copy h2,.photo-copy-center h2{font-size:34px}.product-heading-title{align-items:flex-start;gap:10px;flex-direction:column}.product-heading-title>p{font-size:42px}.product-heading-title h2{font-size:24px}.history-en{font-size:26px!important}.history-event b{font-size:42px}}
@media(max-width:900px){.history>.history-wheel-cursor,.history-orbit{display:none}}

/* PSD home chapters 01-03. Coordinates are scaled from the 3840px source canvas. */
@media(min-width:901px){
  .hero-ended{background-position:top center;background-size:100% auto;background-repeat:no-repeat}
  .hero-ended::after{content:"";position:absolute;z-index:1;top:min(49.42vw,87.86svh);right:0;bottom:0;left:0;background:radial-gradient(ellipse 58% 94% at 50% 108%,rgb(255 255 255/88%) 0%,rgb(255 255 255/48%) 26%,rgb(255 255 255/15%) 50%,transparent 74%),#050506;pointer-events:none}
  .hero-static-machine{top:min(14.74vw,26.2svh);left:22.53%;width:min(30.13vw,53.6svh);max-width:none}

  .reason-intro{display:block;padding:0}
  .intro-machine-wrap{position:absolute;top:min(11.25vw,20svh);left:11.33%;width:min(30.34vw,53.8svh);aspect-ratio:1165/1158}
  .intro-machine-wrap img{width:80.5%;max-height:none}
  .intro-copy{position:absolute;top:min(11.67vw,20.74svh);left:51.59%;width:min(690px,43vw);padding:0}
  .intro-copy h2{margin:0 0 68px;font-size:58.33px;line-height:1.2;font-weight:500;white-space:nowrap;scale:1.068 1;transform-origin:left center}
  .intro-copy h2 span{margin-left:8px}
  .reason-list li{display:block!important;margin:0 0 51.5px;padding:0!important}
  .reason-list li:nth-child(2){margin-bottom:65px}
  .reason-list b{display:block;font-size:43.75px!important;line-height:1.2;font-weight:500;transform:scaleX(1.05);transform-origin:left center}
  .reason-list li>span{display:block;margin-top:14.5px;color:#111!important;font-size:29.17px!important;line-height:1.2;font-weight:500;white-space:nowrap;transform:scaleX(1.08);transform-origin:left center}

  .reason-tabs{top:min(11.48vw,20.42svh);left:19.09%;width:62.6%;display:flex;justify-content:space-between;gap:0;transform:none}
  .reason-tabs a{display:flex;min-width:0;padding:0;align-items:center;justify-content:flex-start;gap:29px;color:#fff;border:0;font-size:29.17px;font-weight:500;line-height:1.2}
  .reason-tabs a::after{display:none}
  .reason-tabs a.active{color:#fff}
  .reason-tab-icon{flex:0 0 auto;width:auto;height:54px;object-fit:contain}
  .reason-tabs .reason-tab-label{display:block;color:#fff;font-size:29.17px;font-weight:500;line-height:1.2;transform:translateY(8px) scaleX(1.07);transform-origin:left center}
  .performance-content{top:min(25.21vw,44.82svh);left:24.53%;transform:none}
  .performance-content h2{margin:0;font-size:72.92px;line-height:1.2;font-weight:500;white-space:nowrap;transform:scaleX(1.083);transform-origin:left center}
  .performance-machine{top:min(22.45vw,39.91svh);right:auto;bottom:auto;left:68.46%;width:min(5.44vw,9.68svh);max-width:none;max-height:none}
  .reason-scene:nth-child(2) .photo-copy{top:min(22.47vw,39.95svh);left:1.88%;width:100%;transform:none}
  .reason-scene:nth-child(3) .photo-copy{top:min(23.62vw,41.99svh);left:.26%;width:100%;transform:none}
  .photo-copy h2,.photo-copy-center h2{margin:0;font-size:58.33px;line-height:1.2;font-weight:500;white-space:nowrap;transform:scaleX(1.09)}
}

@media(max-width:900px){
  .hero-ended::after{content:"";position:absolute;z-index:1;right:0;bottom:0;left:0;height:24%;background:radial-gradient(ellipse 72% 100% at 50% 108%,rgb(255 255 255/78%) 0%,rgb(255 255 255/30%) 38%,transparent 74%);pointer-events:none}
  .reason-tab-icon{display:none}
  .intro-copy h2{white-space:normal}
  .reason-list li>span{display:block;margin-top:4px}
}

/* Product chapter matched to the supplied 1300 x 627 reference. */
.products{
  z-index:111;
  min-height:100svh;
  padding:12px 0 12px 9px;
  align-items:center;
  background:#f4f4f2;
}
.product-shell{width:100%;max-width:none;margin:0}
.product-heading{min-height:46px;margin:0 9px 24px 0;align-items:flex-end}
.product-heading-title h2{position:relative;top:4px;left:-6px;display:flex;align-items:baseline;gap:6px;margin:0;line-height:1}
.product-heading-title h2>span{color:#090909;font-size:40px;font-weight:700}
.product-heading-title h2>em{color:var(--ruijun-red);font-size:16px;font-style:normal;font-weight:400}
.product-heading>p{max-width:none;color:#707277;font-size:13px;line-height:1.45;text-align:right}
.product-grid{gap:15px}
.product-card{aspect-ratio:420/259;border-radius:4px}
.product-card:focus-visible{outline:3px solid var(--ruijun-red);outline-offset:2px}
.product-card>div{bottom:14%;min-width:37%;padding:10px 12px 16px;background:rgb(48 52 55/78%)}
.product-card small{margin:0 0 2px;color:rgb(255 255 255/78%);font-size:10px;line-height:1.25}
.product-card h3{margin:0;font-size:17px;line-height:1.3;font-weight:600}

@media(max-width:900px){
  .products{z-index:auto;min-height:auto;padding:86px 20px 64px}
  .product-heading{display:block;min-height:0;margin:0 0 24px}
  .product-heading-title h2{top:0;left:0;gap:12px}
  .product-heading-title h2>span{font-size:36px}
  .product-heading-title h2>em{font-size:16px}
  .product-heading>p{margin-top:14px;text-align:left}
  .product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:620px){
  .products{padding:58px 16px}
  .product-grid{grid-template-columns:1fr}
}
</style>
