<script setup lang="ts">
import { getHeroState } from '~/shared/home-hero-state.mjs';
import { resolveHomepageProducts } from '~/shared/home-product-catalog.mjs';
import { resolvePageSection } from '~/shared/page-sections.mjs';
import { fieldPresentationAttributes, sectionPresentationAttributes } from '~/shared/section-presentation.mjs';
import { homepageFieldPresentationPath, homepageReasonBinding, homepageSectionItemBinding } from '~/shared/visual-binding-paths.mjs';
import '~/assets/page-content.css';

const { data: page } = await useFetch('/api/public/v1/pages/home', {
  default: () => ({ data: null, source: 'static', cache: 'unavailable' })
});
const { data: heroMediaResponse } = await useFetch('/api/public/v1/media/home.hero.video', {
  default: () => ({ data: [] as Array<{ path?: string; posterPath?: string; mediaType?: string; muted?: boolean; loop?: boolean }> })
});
const { data: cmsProductSeriesResponse } = await useFetch('/api/public/v1/product-series', {
  default: () => ({ data: [] as Array<{ id?: string | number; slug?: string; name?: string; series_code?: string; positioning?: string; cover_asset?: string }> })
});
const { data: cmsMilestonesResponse } = await useFetch('/api/public/v1/milestones', {
  default: () => ({ data: [] as Array<{ id?: string | number; year: number; event: string; evidence?: string; icon_asset?: string }> })
});

const { enabled: cmsPreviewEnabled, record: cmsPreviewRecord, recordsFor: cmsPreviewRecords, visualEditMode: cmsVisualEditMode } = useCmsDraftPreview();
const pageContent = shallowRef<Record<string, any> | null>(null);
const heading = computed(() => pageContent.value?.title || '瑞钧智科中走丝线切割机床');
const heroContent = computed(() => resolvePageSection(pageContent.value, 'hero', { title: heading.value, body: '', label: '', href: '#reasons' }));
const reasonsHeading = computed(() => resolvePageSection(pageContent.value, 'why-ruijun', { title: '选择瑞钧的\n三大理由' }));
const reasonsHeadingLines = computed(() => String(reasonsHeading.value.title || '').split('\n').filter(Boolean));
const reasonFallbacks = [
  { id: 'performance', title: '增效降损', shortTitle: '增效降损', introTitle: '增效降损', introDetail: '效能提升50%，丝损降低30%', body: '效能提升50%，丝损降低30%', image: '/assets/psd/reason-efficiency-machine.png', icon: '/assets/psd/reason-tab-efficiency.png', mode: 'machine' },
  { id: 'advanced-manufacturing', title: '30年技术沉淀，先进制造工厂', shortTitle: '先进智造', introTitle: '先进智造', introDetail: '30年技术沉淀，先进制造工厂', body: '30年技术沉淀，先进制造工厂', image: '/assets/psd/reason-factory-full.jpg', icon: '/assets/psd/reason-tab-manufacturing.png', mode: 'photo' },
  { id: 'industry-leadership', title: '销量持续领先，品质始终如一', shortTitle: '领军品牌', introTitle: '行业领军品牌', introDetail: '销量持续领先，品质始终如一', body: '销量持续领先，品质始终如一', image: '/assets/psd/reason-market-full.jpg', icon: '/assets/psd/reason-tab-leadership.png', mode: 'photo' }
];
const reasons = shallowRef<Array<Record<string, any>>>([]);
const marqueeSourceSection = shallowRef<Record<string, any> | null>(null);
const marqueeSection = shallowRef<Record<string, any>>({ items: [], marquee_items: [] });
const marqueeItems = shallowRef<Array<Record<string, any>>>([]);

function rebuildHomepageDerivedContent(currentPage: Record<string, any> | null) {
  const fixedReasons = reasonFallbacks.map((fallback) => {
    const sourceSection = Array.isArray(currentPage?.sections)
      ? currentPage.sections.find((candidate: any) => String(candidate?.id || '') === fallback.id)
      : null;
    const section = resolvePageSection(currentPage, fallback.id, fallback);
    return {
      ...fallback,
      ...section,
      shortTitle: section.shortTitle || section.label || fallback.shortTitle,
      introTitle: section.introTitle || section.title || fallback.introTitle,
      introDetail: section.introDetail || section.description || section.body || fallback.introDetail,
      body: section.body || section.introDetail || fallback.body,
      cmsBinding: homepageReasonBinding(section, sourceSection)
    };
  });
  const extraReasons = (Array.isArray(currentPage?.sections) ? currentPage.sections : [])
    .filter((section: any) => /^reason-[1-9][0-9]*$/.test(String(section?.id || '')))
    .sort((left: any, right: any) => Number(left?.sort_order || 0) - Number(right?.sort_order || 0))
    .map((section: any, index: number) => {
    const fallback = {
      id: String(section.id),
      title: `首页理由 ${index + 4}`,
      shortTitle: `理由 ${index + 4}`,
      introTitle: `首页理由 ${index + 4}`,
      introDetail: '',
      body: '',
      image: '/assets/psd/reason-market-full.jpg',
      icon: '/assets/psd/reason-tab-leadership.png',
      mode: 'photo'
    };
    const resolved = resolvePageSection(currentPage, fallback.id, fallback);
    return {
      ...fallback,
      ...resolved,
      shortTitle: resolved.shortTitle || resolved.label || fallback.shortTitle,
      introTitle: resolved.introTitle || resolved.title || fallback.introTitle,
      introDetail: resolved.introDetail || resolved.description || resolved.body || fallback.introDetail,
      body: resolved.body || resolved.introDetail || fallback.body,
      cmsBinding: homepageReasonBinding(resolved, section)
    };
    });
  const resolvedReasons = [...fixedReasons, ...extraReasons];
  reasons.value = resolvedReasons;

  const sourceSection = Array.isArray(currentPage?.sections)
    ? currentPage.sections.find((section: any) => String(section?.id || '') === 'marquee') || null
    : null;
  const resolvedMarqueeSection = resolvePageSection(currentPage, 'marquee', { items: [] as Array<Record<string, any>>, marquee_items: [] as Array<Record<string, any>> });
  marqueeSourceSection.value = sourceSection;
  marqueeSection.value = resolvedMarqueeSection;
  const source = Array.isArray(resolvedMarqueeSection.items)
    ? resolvedMarqueeSection.items
    : (Array.isArray((resolvedMarqueeSection as any).marquee_items) ? (resolvedMarqueeSection as any).marquee_items : []);
  if (!source.length) {
    marqueeItems.value = resolvedReasons;
    return;
  }
  marqueeItems.value = source.map((item: any, index: number) => {
    const fallback = resolvedReasons[index % Math.max(1, resolvedReasons.length)] || reasonFallbacks[index % reasonFallbacks.length];
    return {
      ...fallback,
      ...item,
      id: String(item.id || `marquee-${index + 1}`),
      shortTitle: String(item.shortTitle || item.label || item.title || fallback.shortTitle),
      introTitle: String(item.introTitle || item.title || fallback.introTitle),
      introDetail: String(item.introDetail || item.description || item.body || fallback.introDetail),
      body: String(item.body || item.description || fallback.body || ''),
      image: String(item.image || fallback.image),
      icon: String(item.icon || fallback.icon),
      mode: String(item.mode || fallback.mode),
      cmsBinding: homepageSectionItemBinding(resolvedMarqueeSection, sourceSection, index)
    };
  });
}

// Build the page snapshot and all homepage derivations in one reactive effect.
// Keeping these writes together prevents the live preview from rendering a new
// page snapshot with stale reason/marquee arrays during Vue scheduler turns.
watchEffect(() => {
  const published = page.value?.data || null;
  const draft = cmsPreviewRecord.value;
  const currentPage = !draft || draft.slug !== 'home'
    ? published
    : { ...(published || {}), ...draft };
  pageContent.value = currentPage;
  rebuildHomepageDerivedContent(currentPage);
});

function previewPerformanceBody(record: any) {
  return String(record?.sections?.find?.((section: any) => section?.id === 'performance')?.body || '');
}

watchEffect(() => {
  if (!import.meta.client || !cmsPreviewEnabled.value) return;
  document.documentElement.dataset.cmsPreviewHomeRecordBody = previewPerformanceBody(cmsPreviewRecord.value);
  document.documentElement.dataset.cmsPreviewHomePageBody = previewPerformanceBody(pageContent.value);
  document.documentElement.dataset.cmsPreviewHomeReasonBody = String(reasons.value.find((reason: any) => reason.id === 'performance')?.body || '');
  document.documentElement.dataset.cmsPreviewHomeMarqueeBody = String(marqueeItems.value.find((reason: any) => reason.id === 'performance')?.body || '');
});

function reasonAnchor(id: string) {
  return `#reason-${id}`;
}
const historySection = computed(() => resolvePageSection(pageContent.value, 'history', {
  title: '瑞钧智科的中走丝制造历史', kicker: '', label: '', media: []
}));
const productsSection = computed(() => resolvePageSection(pageContent.value, 'products', {
  kicker: 'Our product', title: '我们的产品'
}));
const fallbackProducts = [
  { id: 'workstation', name: '灵动切割工作站', series: '无人化加工系列', image: '/assets/psd/product-workstation.png' },
  { id: 'fr-xs-auto', name: 'FR-XS (auto)', series: '自动穿丝系列', image: '/assets/psd/product-auto.png' },
  { id: 'fr-pro', name: 'FR (pro)', series: '高速切割系列', image: '/assets/psd/product-pro.png' },
  { id: 'ft-xs', name: 'FT-XS', series: '一体机系列', image: '/assets/psd/product-ft-xs.png' },
  { id: 'fr-y', name: 'FR-Y', series: '大摇摆系列', image: '/assets/psd/product-fr-y.png' },
  { id: 'fl-xs', name: 'FL-XS', series: '超大型系列', image: '/assets/psd/product-fl-xs.png' }
];
const products = computed(() => {
  const publishedRecords = Array.isArray(cmsProductSeriesResponse.value?.data) ? cmsProductSeriesResponse.value.data : [];
  const previewRecords = cmsPreviewEnabled.value ? cmsPreviewRecords('product_series') : [];
  return resolveHomepageProducts(publishedRecords, previewRecords, fallbackProducts);
});
const fallbackMilestones = [
  ['1997', '成立丰华数控', '公司始创'], ['2003', '创新中走丝', '初代研发'], ['2006', '成立瑞钧机械', '迁址昆山'],
  ['2014', '启用新建厂房', '规模化生产'], ['2016', '扩建流水线车间', '标准化生产'], ['2025', '启用瑞钧智科', '常熟基地']
];
const milestones = computed(() => {
  const publishedRecords = Array.isArray(cmsMilestonesResponse.value?.data) ? cmsMilestonesResponse.value.data : [];
  const previewRecords = cmsPreviewEnabled.value ? cmsPreviewRecords('milestones') : [];
  const records = previewRecords.length ? previewRecords : publishedRecords;
  return records.length ? records.map((record) => [String(record.year), record.event, record.evidence || '', { collection: 'milestones', itemId: String(record.id || '') }]) : fallbackMilestones.map((item) => [...item, { collection: '', itemId: '' }]);
});
const historyTitle = computed(() => resolvePageSection(pageContent.value, 'history', {
  title: '瑞钧智科的中走丝制造历史'
}).title);
const historyEnglishLines = computed(() => {
  const configured = String(historySection.value.kicker || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return configured.length ? configured : ['The Development', 'History of Ruijun.', "Zhike's Mid Speed", 'Wire Manufacturing'];
});
const historyHint = computed(() => String(historySection.value.label || '').trim() || 'SCROLL TO EXPLORE');
const historyIcon = computed(() => {
  const media = Array.isArray(historySection.value.media) ? historySection.value.media : [];
  const configuredIndex = media.findIndex((item: any) => String(item?.role || '') === 'icon' && String(item?.path || '').trim());
  if (configuredIndex >= 0) {
    const configured = media[configuredIndex];
    return {
      path: String(configured.path).trim(),
      alt: String(configured.alt || '时间轴导航'),
      fieldPath: configured.managed === true ? `media.${configuredIndex}` : ''
    };
  }
  const milestone = cmsMilestonesResponse.value?.data?.find((item) => String(item?.icon_asset || '').trim());
  return { path: String(milestone?.icon_asset || '/assets/about-psd/history-guide-wheel.png').trim(), alt: '时间轴导航', fieldPath: '' };
});
const productTask = computed(() => resolvePageSection(pageContent.value, 'product-task', {
  kicker: 'RUIJUN MEDIUM SPEED WIRE EDM', body: '通过工件、精度、节拍和自动化需求获得选型建议。', title: '让下一台设备匹配你的加工任务', href: '/contact', label: '获取选型建议'
}));

const videoCompleted = ref(false);
const videoFailed = ref(false);
const videoFading = ref(false);
const heroVideo = ref<HTMLVideoElement>();
const autoplaySoundBlocked = ref(false);
let videoFadeTimer: number | undefined;
const heroState = computed(() => getHeroState(videoCompleted.value, videoFailed.value));
const showHeroNextButton = computed(() => videoCompleted.value);
const heroMedia = computed(() => Array.isArray(heroMediaResponse.value?.data) ? heroMediaResponse.value.data[0] : null);
// The page section may provide a dedicated video/end-frame pair. Keep the
// placement asset as the fallback so legacy media records remain compatible.
const previewHeroVideoSource = computed(() => {
  const previewUrl = String(heroContent.value?.hero_video_asset_url || '').trim();
  if (/^(?:\/api\/preview\/media\/[1-9]\d*|\/assets\/|https?:\/\/)/i.test(previewUrl)) return previewUrl;
  const value = String(heroContent.value?.hero_video_asset_id || '').trim();
  return /^(?:\/assets\/|https?:\/\/)/.test(value) ? value : '';
});
const heroVideoSource = computed(() => previewHeroVideoSource.value || heroContent.value.video || heroMedia.value?.path || '/assets/home-intro-raw.mp4');
const heroEndFrame = computed(() => heroContent.value.image || heroMedia.value?.posterPath || '/assets/home-intro-end-video-sharpened.png?v=1');
const historyBackground = computed(() => historySection.value.media?.find((media: any) => media?.mediaType !== 'video')?.path || '');
const historyBackgroundFieldPath = computed(() => {
  const media = Array.isArray(historySection.value.media) ? historySection.value.media : [];
  const index = media.findIndex((item: any) => item?.mediaType !== 'video' && String(item?.path || '').trim());
  return index >= 0 && media[index]?.managed === true ? `media.${index}` : '';
});

function freezeHeroVideo() {
  if (videoCompleted.value || videoFailed.value) return;
  videoFading.value = true;
  videoCompleted.value = true;
  heroVideo.value?.pause();
  window.clearTimeout(videoFadeTimer);
  videoFadeTimer = window.setTimeout(() => { videoFading.value = false; }, 700);
}

function finishHeroVideo() {
  freezeHeroVideo();
}

function handleHeroVideoError() {
  videoFailed.value = true;
}

async function startHeroVideo() {
  const video = heroVideo.value;
  if (!video) return;
  autoplaySoundBlocked.value = video.muted;
  try {
    await video.play();
  } catch {
    // Browsers block first-visit audible autoplay. Preserve motion by retrying muted.
    autoplaySoundBlocked.value = true;
    video.muted = true;
    await video.play().catch(handleHeroVideoError);
  }
}

function restoreHeroSoundAfterInteraction() {
  if (!autoplaySoundBlocked.value || !heroVideo.value) return;
  heroVideo.value.muted = false;
  void heroVideo.value.play().then(() => { autoplaySoundBlocked.value = false; }).catch(() => {
    heroVideo.value && (heroVideo.value.muted = true);
  });
}

function toggleHeroSound() {
  const video = heroVideo.value;
  if (!video) return;
  video.muted = !video.muted;
  autoplaySoundBlocked.value = video.muted;
  if (!video.muted) void video.play().catch(() => { video.muted = true; autoplaySoundBlocked.value = true; });
}

onMounted(() => {
  watch(() => heroState.value.stageVisible, ready => { if (ready) window.dispatchEvent(new Event('ruijun:hero-ready')); }, { immediate: true });
  nextTick(startHeroVideo);
  window.addEventListener('pointerdown', restoreHeroSoundAfterInteraction, { once: true, passive: true });
  window.addEventListener('wheel', restoreHeroSoundAfterInteraction, { once: true, passive: true });
  window.addEventListener('keydown', restoreHeroSoundAfterInteraction, { once: true });
  window.addEventListener('ruijun:hero-freeze', freezeHeroVideo);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) handleHeroVideoError();
});
onBeforeUnmount(() => {
  window.clearTimeout(videoFadeTimer);
  window.removeEventListener('pointerdown', restoreHeroSoundAfterInteraction);
  window.removeEventListener('wheel', restoreHeroSoundAfterInteraction);
  window.removeEventListener('keydown', restoreHeroSoundAfterInteraction);
  window.removeEventListener('ruijun:hero-freeze', freezeHeroVideo);
});
useHead({ title: '中走丝线切割机床' });
</script>

<template>
  <main class="home-page">
    <svg class="hero-end-filter" aria-hidden="true" focusable="false">
      <filter id="hero-end-sharpen" color-interpolation-filters="sRGB">
        <feConvolveMatrix order="3" kernelMatrix="0 -0.32 0 -0.32 2.28 -0.32 0 -0.32 0" preserveAlpha="true" />
        <feComponentTransfer><feFuncR type="linear" slope="1.035" intercept="-0.012" /><feFuncG type="linear" slope="1.035" intercept="-0.012" /><feFuncB type="linear" slope="1.035" intercept="-0.012" /></feComponentTransfer>
      </filter>
    </svg>
    <SiteHeader home-psd />
    <HomeImmersiveMotion />
    <section id="home" class="hero lifecycle-panel" v-bind="sectionPresentationAttributes(heroContent)" :class="{ 'hero-ended': heroState.stageVisible }" data-cms-preview-key="hero" data-panel-label="首页" aria-label="首页视频">
      <img class="hero-end-frame cms-media" :src="heroEndFrame" alt="" :data-cms-preview-field-path="heroContent.image ? 'image' : undefined" data-cms-preview-media-role="background">
      <video v-if="heroState.videoVisible && (!videoCompleted || videoFading) || cmsVisualEditMode" :key="heroVideoSource" ref="heroVideo" class="hero-video cms-media" :src="heroVideoSource" autoplay playsinline :muted="heroMedia?.muted !== false" :loop="heroMedia?.loop === true || cmsVisualEditMode" :poster="heroEndFrame" data-cms-preview-field-path="hero_video_asset_id" data-cms-preview-placement-key="home.hero.video" data-cms-preview-media-role="video" data-cms-preview-allow-default="true" @ended="finishHeroVideo" @error="handleHeroVideoError"></video>
      <button v-if="heroState.videoVisible && !videoCompleted" type="button" class="hero-sound-toggle" :class="{ 'is-muted': autoplaySoundBlocked }" :aria-pressed="!autoplaySoundBlocked" aria-live="polite" @click="toggleHeroSound">{{ autoplaySoundBlocked ? '开启视频声音' : '关闭视频声音' }}</button>
<div v-if="heroContent.body || heroContent.label" class="hero-cms-copy cms-positioned"><p v-if="heroContent.body" v-bind="fieldPresentationAttributes(heroContent, 'body')" data-cms-preview-field="body" data-cms-preview-field-path="body" data-cms-preview-position-field-path="field_presentation.body">{{ heroContent.body }}</p><a v-if="heroContent.label" v-bind="fieldPresentationAttributes(heroContent, 'label')" data-cms-preview-field="label" data-cms-preview-field-path="label" data-cms-preview-link-field-path="href" data-cms-preview-position-field-path="field_presentation.label" :href="heroContent.href || '#reasons'">{{ heroContent.label }}</a></div>
      <!-- Keep the legacy selector contract stable while binding the visible fallback CTA. -->
      <a class="hero-ended-link" :class="{ 'is-visible': showHeroNextButton }" v-bind="fieldPresentationAttributes(heroContent, 'label')" data-cms-preview-field="label" data-cms-preview-field-path="label" data-cms-preview-link-field-path="href" data-cms-preview-position-field-path="field_presentation.label" :href="heroContent.href || '#reasons'">{{ heroContent.label || '了解更多' }} <span aria-hidden="true">→</span></a>
    </section>

    <section id="reasons" class="reason-intro lifecycle-panel" v-bind="sectionPresentationAttributes(reasonsHeading)" data-cms-preview-key="why-ruijun" data-panel-label="选择瑞钧" aria-labelledby="reasons-title">
      <div class="intro-machine-wrap" aria-hidden="true"><div class="intro-machine-glow"></div><img src="/assets/psd/hero-machine.png" alt=""></div>
<div class="intro-copy cms-positioned"><h2 id="reasons-title" class="cms-styled-text" v-bind="fieldPresentationAttributes(reasonsHeading, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ reasonsHeadingLines[0] }}<span v-if="reasonsHeadingLines[1]">{{ reasonsHeadingLines.slice(1).join(' ') }}</span></h2><ol class="reason-list"><li v-for="reason in reasons" :key="reason.id" :data-cms-preview-key="reason.id" :data-cms-preview-collection="reason.cmsBinding?.collection" :data-cms-preview-item-id="reason.cmsBinding?.itemId"><b v-bind="fieldPresentationAttributes(reason, 'introTitle')" :data-cms-preview-field-path="reason.cmsBinding?.fields.introTitle" :data-cms-preview-position-field-path="homepageFieldPresentationPath(reason.cmsBinding, 'introTitle')">{{ reason.introTitle }}</b><span v-bind="fieldPresentationAttributes(reason, 'introDetail')" :data-cms-preview-field-path="reason.cmsBinding?.fields.introDetail" :data-cms-preview-position-field-path="homepageFieldPresentationPath(reason.cmsBinding, 'introDetail')">{{ reason.introDetail }}</span></li></ol></div>
    </section>

    <section id="reason-showcase" class="reason-showcase lifecycle-panel" data-panel-label="三大理由" aria-label="选择瑞钧的三大理由">
      <div class="reason-tabs" aria-label="首页横移图文"><a v-for="tab in marqueeItems" :key="tab.id" :href="reasonAnchor(tab.id)" :data-cms-preview-key="tab.id" :data-cms-preview-collection="tab.cmsBinding?.collection" :data-cms-preview-item-id="tab.cmsBinding?.itemId"><img class="reason-tab-icon" :src="tab.icon" alt="" data-cms-preview-placement-key="home.reason.icon" :data-cms-preview-media-role="tab.cmsBinding?.fields.icon ? 'icon' : undefined" :data-cms-preview-field-path="tab.cmsBinding?.fields.icon"><span class="reason-tab-label" v-bind="fieldPresentationAttributes(tab, 'shortTitle')" :data-cms-preview-field-path="tab.cmsBinding?.fields.shortTitle" :data-cms-preview-position-field-path="homepageFieldPresentationPath(tab.cmsBinding, 'shortTitle')">{{ tab.shortTitle }}</span></a></div>
      <div class="reason-horizontal-track">
        <article v-for="(reason, index) in marqueeItems" :id="reasonAnchor(reason.id).slice(1)" :key="reason.id" class="reason-scene" v-bind="sectionPresentationAttributes(reason)" :class="reason.mode === 'machine' ? 'reason-performance' : 'photo-scene'" :data-cms-preview-key="reason.id" :data-cms-preview-collection="reason.cmsBinding?.collection" :data-cms-preview-item-id="reason.cmsBinding?.itemId" :data-reason-slide="index">
          <img v-if="reason.mode === 'photo'" class="scene-photo cms-media" :src="reason.image" :alt="reason.shortTitle" :data-cms-preview-placement-key="reason.mode === 'machine' ? 'home.reason.machine' : 'home.reason.background'" :data-cms-preview-media-role="reason.cmsBinding?.fields.image ? 'background' : undefined" :data-cms-preview-field-path="reason.cmsBinding?.fields.image">
          <div v-if="reason.mode === 'photo'" class="scene-shade" :class="{ 'scene-shade-strong': index === 2 }"></div>
          <div v-if="reason.mode === 'machine'" class="performance-group"><div class="performance-content cms-positioned"><p class="performance-statement cms-styled-text" v-bind="fieldPresentationAttributes(reason, 'body')" :data-cms-preview-field-path="reason.cmsBinding?.fields.body" :data-cms-preview-position-field-path="homepageFieldPresentationPath(reason.cmsBinding, 'body')">{{ reason.body || reason.introDetail }}</p></div><img class="performance-machine cms-media" :src="reason.image" alt="瑞钧中走丝线切割机床" @error="(event) => { const image = event.currentTarget as HTMLImageElement; if (image.dataset.fallbackApplied !== 'true') { image.dataset.fallbackApplied = 'true'; image.src = '/assets/psd/reason-efficiency-machine.png'; } }" :data-cms-preview-placement-key="'home.reason.machine'" :data-cms-preview-media-role="reason.cmsBinding?.fields.image ? 'foreground' : undefined" :data-cms-preview-field-path="reason.cmsBinding?.fields.image"></div>
          <div v-else class="cms-positioned photo-copy" :class="{ 'photo-copy-center': index === 2 }"><h2 class="cms-styled-text" v-bind="fieldPresentationAttributes(reason, 'title')" :data-cms-preview-field-path="reason.cmsBinding?.fields.title" :data-cms-preview-position-field-path="homepageFieldPresentationPath(reason.cmsBinding, 'title')">{{ reason.title }}</h2></div>
        </article>
      </div>
      <div class="reason-progress" aria-hidden="true"><i v-for="reason in marqueeItems" :key="`progress-${reason.id}`"></i></div>
    </section>

    <section id="products" class="products lifecycle-panel" v-bind="sectionPresentationAttributes(productsSection)" data-cms-preview-key="products" data-panel-label="产品中心" aria-labelledby="products-title">
      <div class="product-shell">
<div class="product-heading"><p class="product-heading-en" v-bind="fieldPresentationAttributes(productsSection, 'kicker')" data-cms-preview-field="kicker" data-cms-preview-field-path="kicker" data-cms-preview-position-field-path="field_presentation.kicker">{{ productsSection.kicker || 'Our product' }}</p><h2 id="products-title" class="product-heading-cn" v-bind="fieldPresentationAttributes(productsSection, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title"><template v-if="(productsSection.title || '我们的产品') === '我们的产品'"><span>我们的</span><em>产品</em></template><template v-else>{{ productsSection.title }}</template></h2></div>
        <div class="product-grid">
          <NuxtLink v-for="(product, index) in products" :key="product.id" :to="`/product/${product.slug || product.id}`" class="product-card" :data-cms-preview-key="product.id" :data-cms-preview-collection="product.cmsBinding.collection" :data-cms-preview-item-id="product.cmsBinding.itemId">
            <img :src="product.image" :alt="`${product.name} 设备`" data-cms-preview-media-role="cover" data-cms-preview-placement-key="product.gallery.image" data-cms-preview-allow-default="true" :data-cms-preview-field-path="product.imageFieldPath">
            <div><small data-cms-preview-field="series_code" :data-cms-preview-field-path="`series_code`">{{ index + 1 }} / {{ product.series }}</small><h3 data-cms-preview-field="title" :data-cms-preview-field-path="`name`">{{ product.name }}</h3></div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section id="history" class="history lifecycle-panel" v-bind="sectionPresentationAttributes(historySection)" :style="historyBackground ? { backgroundImage: `url(${historyBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined" :data-cms-preview-field-path="historyBackgroundFieldPath || undefined" :data-cms-preview-placement-key="historyBackgroundFieldPath ? 'about.timeline.background' : undefined" data-cms-preview-media-role="background" data-cms-preview-key="history" data-panel-label="发展历程" aria-labelledby="history-title">
<div class="history-copy cms-positioned"><p id="history-title" class="history-en" v-bind="fieldPresentationAttributes(historySection, 'kicker')" data-cms-preview-field="kicker" data-cms-preview-field-path="kicker" data-cms-preview-position-field-path="field_presentation.kicker"><span v-for="line in historyEnglishLines" :key="line">{{ line }}</span></p><p class="history-cn cms-styled-text" v-bind="fieldPresentationAttributes(historySection, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ historyTitle }}</p></div>
        <div class="history-viewport"><div class="history-track"><article v-for="(milestone, index) in milestones" :key="milestone[0]" class="history-event" :data-cms-preview-key="`milestones.${index}`" :data-cms-preview-collection="milestone[3].collection" :data-cms-preview-item-id="milestone[3].itemId"><b data-cms-preview-field="year" data-cms-preview-field-path="year">{{ milestone[0] }}</b><span><span data-cms-preview-field="event" data-cms-preview-field-path="event">{{ milestone[1] }}</span><template v-if="!milestone[3].collection && milestone[2]"><br>（{{ milestone[2] }}）</template></span></article></div></div>
       <i class="history-wheel-cursor" aria-hidden="true"><img class="history-wheel" :src="historyIcon.path" :alt="historyIcon.alt" data-cms-preview-field="icon" :data-cms-preview-field-path="historyIcon.fieldPath || undefined" :data-cms-preview-placement-key="historyIcon.fieldPath ? 'about.timeline.icon' : undefined" data-cms-preview-media-role="icon"></i><div class="history-orbit"><i class="history-orbit-ring"></i><i class="history-cursor"></i></div><div class="history-progress" aria-hidden="true"><i></i><i></i><i></i></div><p class="history-hint" v-bind="fieldPresentationAttributes(historySection, 'label')" data-cms-preview-field="label" data-cms-preview-field-path="label" data-cms-preview-position-field-path="field_presentation.label">{{ historyHint }} <span>→</span></p>
    </section>

<section id="contact" class="contact-panel lifecycle-panel" v-bind="sectionPresentationAttributes(productTask)" data-cms-preview-key="product-task" data-panel-label="联系瑞钧"><div class="contact-hero cms-positioned"><p v-bind="fieldPresentationAttributes(productTask, 'kicker')" data-cms-preview-field="kicker" data-cms-preview-field-path="kicker" data-cms-preview-position-field-path="field_presentation.kicker">{{ productTask.kicker || 'RUIJUN MEDIUM SPEED WIRE EDM' }}</p><h2 class="cms-styled-text" v-bind="fieldPresentationAttributes(productTask, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ productTask.title }}</h2><p class="contact-copy" v-bind="fieldPresentationAttributes(productTask, 'body')" data-cms-preview-field="body" data-cms-preview-field-path="body" data-cms-preview-position-field-path="field_presentation.body">{{ productTask.body }}</p><NuxtLink :to="productTask.href || '/contact'" v-bind="fieldPresentationAttributes(productTask, 'label')" data-cms-preview-field="label" data-cms-preview-field-path="label" data-cms-preview-link-field-path="href" data-cms-preview-position-field-path="field_presentation.label">{{ productTask.label || '获取选型建议' }} <span aria-hidden="true">→</span></NuxtLink></div><PsdFooter /></section>
  </main>
</template>

<style scoped>
.home-page{min-height:100vh;overflow:hidden;background:#080808;color:#fff}.hero{position:relative;height:100svh;overflow:hidden;background:#050506}.hero-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.hero-stage{position:absolute;inset:0;background:#050506 url('/assets/psd/hero-stage.jpg') center/cover no-repeat}.hero-stage img{position:absolute;top:23.5%;left:14.5%;width:min(40.5vw,610px);max-width:none;filter:drop-shadow(0 25px 34px rgb(0 0 0/32%))}.hero-next{position:absolute;z-index:4;right:7%;bottom:7%;width:42px;height:42px;border:1px solid rgb(255 255 255/55%);border-radius:50%}.hero-next::after{content:"↓";position:absolute;inset:0;display:grid;place-items:center;color:#fff}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.hero-cms-copy{position:absolute;z-index:5;top:23%;left:7%;max-width:min(620px,72vw);padding:18px 22px;color:#fff;text-shadow:0 2px 14px rgb(0 0 0/70%);pointer-events:none}.hero-cms-copy p{max-width:48rem;margin:18px 0 0;font-size:clamp(14px,1.15vw,20px);line-height:1.6}.hero-cms-copy a{display:inline-flex;margin-top:24px;padding:11px 18px;background:var(--ruijun-red);color:#fff;text-decoration:none;pointer-events:auto}
.reason-intro{position:relative;min-height:100svh;display:grid;grid-template-columns:48% 52%;align-items:center;padding:105px max(6vw,calc((100vw - var(--ruijun-max))/2));overflow:hidden;background:#f3f3f1;color:#131313}.intro-machine-stage{position:relative;width:min(520px,39vw);aspect-ratio:1;display:grid;place-items:center;overflow:hidden;background:#0b0b0c;border-radius:5px}.intro-machine-stage span{position:absolute;inset:18%;background:rgb(255 255 255/15%);filter:blur(70px)}.intro-machine{position:relative;width:94%;max-height:92%;object-fit:contain}.intro-copy{padding-left:8vw}.intro-copy>p,.product-heading>div>p,.contact-panel>div>p{margin:0;color:var(--ruijun-red);font-size:12px}.intro-copy h2{max-width:570px;margin:16px 0 38px;white-space:pre-line;font-size:clamp(48px,6vw,82px);line-height:1.04;font-weight:500}.intro-copy h2::first-line{color:#161719}.intro-copy ol{max-width:560px;margin:0;padding:0;list-style:none}.intro-copy li{display:grid;grid-template-columns:38px 1fr;gap:12px;padding:13px 0;border-top:1px solid rgb(19 19 19/20%)}.intro-copy li>b{color:var(--ruijun-red);font-size:10px}.intro-copy li div{display:grid;grid-template-columns:145px 1fr;gap:18px}.intro-copy strong{font-size:17px}.intro-copy li span{color:#74777b;font-size:12px}
.reason-showcase{position:relative;height:100svh;overflow:hidden;background:#09090a}.reason-card{position:absolute;inset:0;overflow:hidden;color:#fff;background:#09090a;clip-path:inset(0 0 0 100%)}.reason-card:first-child{clip-path:inset(0)}.reason-card>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.reason-machine>img{inset:auto 12% 10% auto;width:25vw;max-width:360px;height:auto;max-height:50vh;object-fit:contain}.scene-shade{position:absolute;inset:0;background:rgb(3 8 11/20%)}.reason-card nav{position:absolute;z-index:3;top:84px;right:7%;left:7%;display:grid;grid-template-columns:repeat(3,1fr)}.reason-card nav span{padding:15px 0;color:rgb(255 255 255/36%);border-bottom:1px solid rgb(255 255 255/18%);font-size:16px;font-weight:600}.reason-card nav span.active{color:#fff;border-color:var(--ruijun-red)}.reason-card nav b{margin-right:10px;color:var(--ruijun-red);font-size:9px}.reason-copy{position:absolute;z-index:3;top:48%;left:11%;max-width:680px;transform:translateY(-50%)}.reason-photo .reason-copy{left:50%;width:min(980px,86vw);max-width:none;transform:translate(-50%,-50%);text-align:center}.reason-copy p{margin:0 0 20px;color:#fff;font-size:12px}.reason-copy h2{margin:0 0 24px;color:var(--ruijun-red);white-space:pre-line;font-size:clamp(48px,5vw,76px);line-height:1.08;font-weight:500}.reason-photo .reason-copy h2{color:#fff}.reason-copy>span{display:block;max-width:680px;color:rgb(255 255 255/76%);font-size:16px;line-height:1.8}.reason-photo .reason-copy>span{margin:0 auto}.reason-copy small{display:block;margin-top:22px;color:rgb(255 255 255/45%);font-size:11px}
.products{min-height:100svh;display:flex;align-items:center;padding:98px 6.2% 54px;background:var(--ruijun-paper);color:var(--ruijun-ink)}.product-shell{width:min(var(--ruijun-max),100%);margin:0 auto}.product-heading{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:26px}.product-heading h2{margin:0;font-size:38px;line-height:1;font-weight:600}.product-heading h2 span{margin-left:6px;color:var(--ruijun-red);font-size:17px;font-weight:500}.product-heading>p{max-width:430px;margin:0;color:var(--ruijun-muted);font-size:13px}.product-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.product-card{position:relative;min-width:0;aspect-ratio:1.63;overflow:hidden;background:#e5eaec;border-radius:4px;text-decoration:none;transition:transform .25s ease,box-shadow .25s ease}.product-card:hover{transform:translateY(-4px);box-shadow:0 14px 30px rgb(20 28 34/13%)}.product-card img{width:100%;height:100%;object-fit:cover}.product-card>div{position:absolute;right:0;bottom:14%;min-width:37%;padding:10px 13px;color:#fff;background:rgb(48 52 55/78%)}.product-card small{display:block;color:rgb(255 255 255/70%);font-size:8px}.product-card h3{margin:2px 0 0;font-size:16px;font-weight:600}
.history{position:relative;height:100svh;min-height:660px;overflow:hidden;color:#444649;background:#f3f2ee}.history::before{content:"";position:absolute;inset:12px;border:1px solid rgb(255 255 255/70%);box-shadow:inset 0 0 110px rgb(119 113 103/8%)}.history-copy{position:absolute;z-index:4;top:24%;right:6.2%;width:45%}.history-copy p{display:grid;row-gap:10px;margin:0;font-size:clamp(48px,5vw,72px);line-height:1.08;font-weight:600}.history-copy p span{color:rgb(61 63 66/20%)}.history-copy small{display:block;margin-top:24px;color:#77797c;font-size:16px}.history-viewport{position:absolute;z-index:2;inset:100px 0 50px;overflow:hidden}.history-track{position:relative;width:3000px;height:100%}.history-track article{position:absolute;width:280px}.history-track article:nth-child(1){top:10%;left:220px}.history-track article:nth-child(2){top:57%;left:700px}.history-track article:nth-child(3){top:18%;left:1180px}.history-track article:nth-child(4){top:62%;left:1660px}.history-track article:nth-child(5){top:12%;left:2140px}.history-track article:nth-child(6){top:55%;left:2620px}.history-track b{display:block;color:var(--ruijun-red);font-size:90px;line-height:1;font-weight:700}.history-track strong,.history-track span{display:block;color:#24262a;font-size:22px}.history>i{position:absolute;z-index:6;top:calc(50% + 20px);left:18%;width:44px;height:13px;background:var(--ruijun-red)}.history>i::after{content:"";position:absolute;top:-11px;right:-25px;border-top:18px solid transparent;border-bottom:18px solid transparent;border-left:26px solid var(--ruijun-red)}.history-hint{position:absolute;z-index:5;bottom:27px;left:6.2%;margin:0;color:#999b9e;font-size:9px}.history-hint span{margin-left:10px;color:var(--ruijun-red);font-size:18px}
.contact-panel{color:#fff;background:#0b0b0c}.contact-panel>div{min-height:42svh;padding:9vh 7% 5vh;background:#131416}.contact-panel h2{margin:8px 0 26px;font-size:42px;line-height:1.2;font-weight:500}.contact-panel a{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;color:#fff;background:var(--ruijun-red);border-radius:2px;font-size:12px;font-weight:600;text-decoration:none}
@media(max-width:760px){.home-page{overflow:visible}.hero{height:calc(100svh - 58px)}.hero-stage img{top:28%;left:-7%;width:98vw}.hero-next{right:20px;bottom:20px}.reason-intro{min-height:auto;display:block;padding:52px 20px 62px}.intro-machine-stage{width:100%;aspect-ratio:1.12;margin-bottom:34px}.intro-copy{padding:0}.intro-copy h2{margin:10px 0 26px;font-size:42px}.intro-copy li div{grid-template-columns:1fr;gap:3px}.intro-copy li span{font-size:11px}.reason-showcase{height:auto}.reason-card{position:relative;min-height:78svh;clip-path:none!important}.reason-card+article{border-top:1px solid rgb(255 255 255/20%)}.reason-card nav{top:26px;right:20px;left:20px}.reason-card nav span{font-size:10px}.reason-card nav b{display:block;margin:0 0 5px}.reason-copy,.reason-photo .reason-copy{top:auto;right:20px;bottom:8%;left:20px;width:auto;transform:none;text-align:left}.reason-copy h2{font-size:38px}.reason-copy>span,.reason-photo .reason-copy>span{margin:0;font-size:13px}.reason-machine>img{right:9%;bottom:26%;width:50vw;max-height:38vh}.products{min-height:auto;padding:62px 20px}.product-heading{display:block}.product-heading>p{margin-top:18px}.product-grid{grid-template-columns:1fr}.history{height:auto;min-height:0;padding:72px 20px}.history::before{inset:4px}.history-copy{position:relative;top:auto;right:auto;width:auto}.history-copy p{font-size:31px}.history-viewport{position:relative;inset:auto;margin-top:58px;overflow-x:auto}.history-track{display:flex;gap:50px;width:max-content;height:auto;padding:0 40px 15px 0;transform:none!important}.history-track article,.history-track article:nth-child(n){position:static;width:220px}.history-track b{font-size:54px}.history-track strong,.history-track span{font-size:16px}.history>i{display:none}.history-hint{position:static;margin-top:30px}.contact-panel>div{min-height:340px;padding:70px 20px}.contact-panel h2{font-size:34px}}
@media (max-width: 720px) { .reason-intro { min-height: auto; } }
@media(prefers-reduced-motion:reduce){.intro-copy,.intro-copy li{opacity:1!important;transform:none!important}.reason-card{clip-path:none!important}.reason-showcase{height:auto}.reason-card{position:relative;min-height:80svh}.history-track,.history-copy,.history>i{transform:none!important}}

/* Legacy visual baseline: these selectors match the pre-Nuxt immersive chapters. */
.lifecycle-panel{position:relative;min-height:100svh;overflow:hidden}
.hero-end-filter{position:absolute;width:0;height:0;overflow:hidden}.hero{height:100svh;background:#050506}
.hero-video{position:absolute;z-index:2;inset:0;width:100%;height:100%;object-fit:cover;opacity:1;transition:opacity .68s cubic-bezier(.22,.8,.24,1)}
.hero.is-machine-morphing .hero-video,.hero.is-machine-morphing .hero-sound-toggle,.hero.is-machine-morphing .hero-ended-link{opacity:0!important;pointer-events:none}
.hero-sound-toggle{position:absolute;z-index:5;bottom:clamp(18px,3vw,48px);left:clamp(18px,3vw,58px);min-height:44px;padding:0 18px;color:#fff;background:rgb(8 8 9 / 72%);border:1px solid rgb(255 255 255 / 70%);border-radius:2px;font:600 14px var(--ruijun-font-cn);cursor:pointer;box-shadow:0 8px 24px rgb(0 0 0 / 28%)}.hero-sound-toggle.is-muted{background:var(--ruijun-red);border-color:var(--ruijun-red)}.hero-sound-toggle:hover,.hero-sound-toggle:focus-visible{background:#fff;border-color:#fff;color:#171719;outline:2px solid #fff;outline-offset:3px}
.hero-video.is-ended{filter:url(#hero-end-sharpen)}
.hero-video.is-fading{opacity:0;pointer-events:none}
.hero-end-frame{position:absolute;z-index:1;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .52s cubic-bezier(.22,.8,.24,1)}
.hero-ended{background:#050506}
.hero-ended .hero-video{opacity:0;pointer-events:none}
.hero-ended .hero-end-frame{opacity:1}
.hero-ended-link{position:absolute;z-index:4;top:59.4%;left:61.2%;display:block;width:16.9%;height:6.5%;color:transparent;background:transparent;border:0;box-shadow:none;font-size:0;text-decoration:none;opacity:0!important;pointer-events:none}
.hero-ended-link span{font-size:0}.hero-ended-link:focus-visible{outline:3px solid #fff;outline-offset:4px}.hero-ended-link.is-visible{opacity:1!important;pointer-events:auto}
.reason-intro{display:grid;grid-template-columns:48% 52%;align-items:center;padding:105px max(6vw,calc((100vw - var(--ruijun-max))/2));background:#f3f3f1;color:#131313}
.intro-machine-wrap{position:relative;width:min(520px,39vw);aspect-ratio:1;display:grid;place-items:center;overflow:hidden;background:#0b0b0c;border-radius:24px}
.intro-machine-glow{position:absolute;inset:18%;background:rgb(255 255 255/15%);filter:blur(70px)}
.intro-machine-wrap img{position:relative;width:88%;max-height:87%;object-fit:contain;transition:opacity .18s ease}
.intro-machine-wrap img.is-morph-hidden{opacity:0}
.intro-machine-wrap.is-stage-morph-hidden{visibility:hidden}
.intro-copy{padding-left:7%}
.intro-copy .section-kicker{margin:0 0 12px;color:var(--ruijun-red);font-size:12px}
.intro-copy h2{max-width:none;margin:0 0 42px;white-space:normal;font-size:48px;line-height:1.18;font-weight:500}
.intro-copy h2 span{margin-left:8px;color:var(--ruijun-red)}
.reason-list{max-width:none!important;margin:0;padding:0;list-style:none}
.intro-copy .section-kicker,.intro-copy h2,.reason-list li{opacity:0;transform:translateY(24px);will-change:transform,opacity;transition:opacity .62s ease,transform .72s cubic-bezier(.22,.8,.24,1)}
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
.reason-scene{position:relative;width:100%;min-width:100%;max-width:100%;height:100svh;flex:0 0 100%;overflow:hidden;color:#fff;background:#09090a}
.reason-tabs{position:absolute;z-index:10;top:13.5%;left:50%;width:min(1240px,88vw);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:30px;transform:translateX(-50%);will-change:transform;pointer-events:auto}
.reason-tabs a{position:relative;display:flex;align-items:baseline;justify-content:center;gap:12px;min-width:0;padding:16px 8px 22px;color:rgb(255 255 255/25%);border-bottom:1px solid rgb(255 255 255/18%);text-align:center;white-space:nowrap;text-decoration:none;font-size:34px;font-weight:700;line-height:1.15;transition:color .35s ease}
.reason-tabs a::after{content:"";position:absolute;right:50%;bottom:-1px;left:50%;height:3px;background:var(--ruijun-red);transition:right .35s ease,left .35s ease}
.reason-tabs a.active{color:#fff}.reason-tabs a.active::after{right:0;left:0}.reason-tabs span{color:var(--ruijun-red);font-size:11px;font-weight:600}
.reason-progress{position:absolute;z-index:8;right:28px;bottom:28px;display:none;gap:7px}.reason-progress i{width:26px;height:2px;background:rgb(255 255 255/30%)}.reason-progress i.active{width:46px;background:var(--ruijun-red)}
.performance-group{position:absolute;z-index:3;top:50%;left:50%;display:flex;align-items:center;justify-content:center;gap:clamp(18px,1.5vw,30px);width:max-content;transform:translate(-50%,-50%);will-change:transform,opacity}.performance-content{position:relative;inset:auto;transform:none;will-change:transform,opacity}.reason-scene .section-kicker{margin:0 0 22px;font-size:13px}.performance-content h2{margin:0 0 24px;color:var(--ruijun-red);white-space:pre-line;font-size:68px;font-weight:500;line-height:1.08}.performance-content>.performance-statement{margin:0;color:var(--ruijun-red);white-space:nowrap;font-size:clamp(28px,2.74vw,58px);line-height:1.2;font-weight:500}.data-note{display:block;margin-top:22px;color:rgb(255 255 255/45%);font-size:11px}
.performance-machine{position:relative;inset:auto;width:min(5.4427vw,11.0758svh);max-width:none;max-height:none;object-fit:contain}.scene-photo{position:absolute;inset:0;display:block;width:100%;height:100%;min-width:100%;object-fit:cover;will-change:transform}.scene-shade,.scene-shade-strong{position:absolute;inset:0;background:rgb(3 8 11/20%)}
.photo-copy{position:absolute;z-index:3;top:51%;left:50%;width:min(980px,86vw);transform:translate(-50%,-50%);text-align:center;will-change:transform,opacity}.photo-copy h2{margin:0 0 26px;white-space:pre-line;font-size:68px;line-height:1.14;font-weight:600}.photo-copy>p{max-width:680px;margin:0 auto;color:rgb(255 255 255/78%);font-size:17px;line-height:1.8}.photo-copy-center h2{font-size:76px}
.history-copy{padding:18px 0 20px}.history-en{position:relative;z-index:1;display:grid!important;row-gap:clamp(10px,.75vw,14px)!important;margin:0;font-size:72px!important;line-height:1.08!important;font-weight:600}.history-en span{position:relative;display:block;width:max-content;max-width:100%;color:transparent!important;background:linear-gradient(90deg,#25272a 0 var(--reveal-progress,0%),rgb(61 63 66/20%) var(--reveal-progress,0%) 100%);background-clip:text;white-space:nowrap}.history-cn{position:relative;z-index:1;margin:24px 0 0!important;color:#77797c;font-size:22px!important}.history-event b{width:max-content;color:transparent!important;background:linear-gradient(90deg,var(--ruijun-red),#f29aa0);background-clip:text}.history-progress{position:absolute;z-index:5;right:6.2%;bottom:38px;display:none;gap:7px}.history-progress i{width:26px;height:2px;background:#bbbcb9}.history-progress i.active{width:48px;background:var(--ruijun-red)}
.history>.history-wheel-cursor{--history-wheel-size:clamp(64px,4.8vw,82px);position:absolute;z-index:4;top:calc(50% + 20px - var(--history-wheel-size) / 2);left:18%;display:block;width:var(--history-wheel-size);height:var(--history-wheel-size);background:transparent;pointer-events:none;will-change:transform}.history>.history-wheel-cursor::before{content:"";position:absolute;z-index:0;top:0;right:50%;width:var(--wire-length,0px);height:3px;background:repeating-linear-gradient(90deg,#aaa7a7 0 14px,transparent 14px 24px);transform:translateY(-50%);pointer-events:none}.history>.history-wheel-cursor::after{display:none}.history-wheel{position:relative;z-index:1;display:block;width:100%;height:100%;object-fit:contain;will-change:transform}.history-orbit{position:absolute;z-index:5;bottom:-1px;left:50%;width:clamp(640px,50vw,920px);height:clamp(150px,12vw,210px);overflow:visible;transform:translateX(-50%);pointer-events:none}.history-orbit-ring{position:absolute;top:0;left:0;display:block;width:100%;aspect-ratio:1;border:3px dotted var(--ruijun-red);border-radius:50%;transform-origin:50% 50%;will-change:transform}.history-orbit .history-cursor{position:absolute;z-index:6;top:-6px;left:calc(50% - 35px);display:block;width:44px;height:13px;background:var(--ruijun-red);will-change:transform}.history-orbit .history-cursor::after{content:"";position:absolute;top:-11px;right:-25px;border-top:18px solid transparent;border-bottom:18px solid transparent;border-left:26px solid var(--ruijun-red)}
.contact-panel{display:grid;grid-template-rows:42% 58%;min-height:100svh}.contact-panel>.contact-hero{min-height:0;padding:9vh 7% 5vh}
@media(min-width:901px){:global(html){scroll-behavior:auto}.lifecycle-panel{height:100svh}.lifecycle-panel>*{transition:opacity .55s ease,transform .7s cubic-bezier(.22,.8,.24,1)}.reason-showcase>.reason-horizontal-track,.history>.history-orbit{transition:none}.reason-scene{position:absolute;inset:0;width:100%;min-width:100%;max-width:100%;flex:none;will-change:clip-path;transform:none}.reason-scene:nth-child(1){z-index:3}.reason-scene:nth-child(2){z-index:2}.reason-scene:nth-child(3){z-index:1}.lifecycle-panel.is-after>*:not(.reason-horizontal-track):not(.history-orbit){opacity:.55;transform:translateY(18px)}.lifecycle-panel.is-active>*{opacity:1}}
@media(min-width:901px) and (max-width:1600px){.history-en{font-size:52px!important}.history-event b{font-size:72px}.history-event span{font-size:18px}}
@media(max-width:1050px){.reason-tabs{width:90vw;gap:18px}.reason-tabs a{gap:8px;font-size:24px}.intro-copy h2{font-size:40px}.performance-content h2,.photo-copy h2{font-size:54px}.photo-copy-center h2{font-size:58px}}
@media(max-width:900px){.hero{min-height:650px;height:calc(100svh - 58px)}.hero-ended-link{top:auto;right:10%;bottom:16%;left:10%;display:flex;width:80%;height:52px;align-items:center;justify-content:center;gap:14px;color:#fff;background:#e82716;border-radius:10px;box-shadow:0 14px 30px rgb(0 0 0/24%);font-size:16px}.hero-ended-link span{font-size:20px}.reason-intro{min-height:auto;padding:100px 6% 70px;grid-template-columns:1fr;gap:36px}.intro-machine-wrap{width:100%;max-width:520px;margin:0 auto}.intro-copy{padding-left:0}.intro-copy .section-kicker,.intro-copy h2,.reason-list li{opacity:1;transform:none}.intro-copy h2{margin-bottom:30px;font-size:34px}.reason-list li{grid-template-columns:116px 1fr!important;gap:12px!important;margin-bottom:19px}.reason-list b{font-size:18px!important}.reason-list li>span{font-size:14px!important}.section-next{display:none}.reason-showcase{height:100svh;min-height:650px}.reason-horizontal-track{display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none}.reason-horizontal-track::-webkit-scrollbar{display:none}.reason-scene{position:relative;inset:auto;width:100vw;height:100svh;min-height:650px;flex:0 0 100vw;scroll-snap-align:start;transform:none!important;box-shadow:none}.reason-tabs{top:12%;width:88vw;gap:0}.reason-tabs a{gap:0;padding:12px 4px 15px;font-size:12px}.reason-tabs span{display:none}.performance-content{top:24%;right:7%;left:7%;transform:none}.performance-content h2{font-size:34px}.performance-machine{right:6%;bottom:3%;width:46vw;max-height:34vh}.photo-copy{width:86vw}.photo-copy h2,.photo-copy-center h2{font-size:34px}.products{min-height:auto}.history{min-height:720px;height:100svh;padding:0}.history-copy{position:absolute;top:92px;right:6%;left:6%;width:auto;padding:0}.history-en{row-gap:0!important;font-size:19px!important;line-height:1.35!important}.history-en span{width:auto;color:#3d3f42!important;background:none;white-space:normal}.history-cn{margin-top:13px!important;font-size:15px!important}.history-viewport{position:absolute;top:245px;right:0;bottom:58px;left:0;margin:0;overflow-x:auto;overflow-y:hidden;opacity:1!important;visibility:visible!important;scroll-snap-type:x proximity}.history-track{display:block;width:1840px;height:100%;padding:0;transform:none!important}.history-event,.history-event:nth-child(n){position:absolute;width:190px}.history-event:nth-of-type(1){top:7%;left:45px}.history-event:nth-of-type(2){top:55%;left:325px}.history-event:nth-of-type(3){top:14%;left:605px}.history-event:nth-of-type(4){top:60%;left:885px}.history-event:nth-of-type(5){top:9%;left:1165px}.history-event:nth-of-type(6){top:52%;left:1445px}.history-event b{font-size:42px}.history-event span{font-size:14px}.history-cursor,.history-progress{display:none}.history-hint{position:absolute;bottom:18px}.contact-panel{min-height:auto;grid-template-rows:auto auto}.contact-panel>.contact-hero{min-height:0;padding:100px 7% 60px}}
@media(prefers-reduced-motion:reduce){.intro-copy .section-kicker,.intro-copy h2,.reason-list li{opacity:1!important;transform:none!important}.reason-scene{transform:none!important}.reason-horizontal-track{display:flex;overflow-x:auto}.history-track,.history-copy,.history-cursor{transform:none!important}}

@media(max-width:900px){.performance-group{top:50%;left:50%;width:88vw;gap:12px;transform:translate(-50%,-50%)}.performance-content{position:relative;top:auto;right:auto;bottom:auto;left:auto;width:auto;transform:none}.performance-content>.performance-statement{white-space:normal;font-size:clamp(18px,4vw,28px)}.performance-machine{position:relative;top:auto;right:auto;bottom:auto;left:auto;width:28vw;max-height:34vh;transform:none}}

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
.history-en{font-family:var(--ruijun-font-latin);font-size:clamp(38px,3.04vw,58px)!important;font-weight:300}
.history-event b{font-family:var(--ruijun-font-latin);font-size:clamp(48px,3.04vw,58px);font-weight:300}
.history-event:nth-child(2) b{font-family:Arial,"Helvetica Neue",sans-serif}
.history-event span{font-family:SimSun,"Songti SC",serif;font-size:clamp(17px,1.15vw,22px);font-weight:400}
@media(max-width:900px){.intro-copy h2{font-size:36px}.reason-list li{grid-template-columns:112px 1fr!important}.reason-list b{font-size:20px!important}.reason-list li>span{font-size:14px!important}.reason-tabs a{font-size:12px}.performance-content h2,.photo-copy h2,.photo-copy-center h2{font-size:34px}.product-heading-title{align-items:flex-start;gap:10px;flex-direction:column}.product-heading-title>p{font-size:42px}.product-heading-title h2{font-size:24px}.history-en{font-size:26px!important}.history-event b{font-size:50px;font-weight:700}}
@media(max-width:900px){.history>.history-wheel-cursor,.history-orbit{display:none}}

/* PSD home chapters 01-03. Coordinates are scaled from the 3840px source canvas. */
@media(min-width:901px){
  .hero-ended{background-position:center;background-size:cover;background-repeat:no-repeat}
  .hero-ended::after{display:none}
  .reason-intro{display:block;padding:0}
  .intro-machine-wrap{position:absolute;top:min(11.25vw,20svh);left:11.33%;width:min(30.34vw,53.8svh);aspect-ratio:1165/1158;border-radius:24px}
  .intro-machine-wrap img{width:80.5%;max-height:none}
  .intro-copy{position:absolute;top:min(11.67vw,20.74svh);left:51.59%;width:min(690px,43vw);padding:0}
  .intro-copy h2{margin:0 0 68px;font-size:44px;line-height:1.2;font-weight:500;white-space:nowrap;transform:none}
  .intro-copy h2 span{margin-left:8px}
  .reason-list li{display:block!important;margin:0 0 51.5px;padding:0!important}
  .reason-list li:nth-child(2){margin-bottom:65px}
  .reason-list b{display:block;font-size:32px!important;line-height:1.2;font-weight:500;transform:none}
  .reason-list li>span{display:block;margin-top:14.5px;color:#111!important;font-size:22px!important;line-height:1.2;font-weight:500;white-space:nowrap;transform:none}

  .reason-tabs{top:min(11.4844vw,23.3704svh);left:19.0885%;width:62.6042%;display:flex;justify-content:space-between;gap:0;transform:none}
  .reason-tabs a{display:flex;min-width:0;padding:0;align-items:center;justify-content:flex-start;color:#fff;border:0;font-size:min(1.5191vw,3.0913svh);font-weight:500;line-height:1.2}
  .reason-tabs a:nth-child(1){gap:min(1.5365vw,3.1267svh)}
  .reason-tabs a:nth-child(2){gap:min(1.6146vw,3.2856svh)}
  .reason-tabs a:nth-child(3){gap:min(2.3438vw,4.7695svh)}
  .reason-tabs a::after{display:none}
  .reason-tabs a.active{color:#fff}
  .reason-tab-icon{flex:0 0 auto;width:auto;height:min(2.8385vw,5.7764svh);object-fit:contain}
  .reason-tabs .reason-tab-label{display:block;color:#fff;font-size:min(1.5191vw,3.0913svh);font-weight:500;line-height:1.2;transform:translateY(min(.4167vw,.848svh)) scaleX(1.07);transform-origin:left center}
  .reason-tabs a.active .reason-tab-label{color:var(--ruijun-red)}
  .performance-group{top:50%;left:50%;gap:min(1.5vw,3.05svh);transform:translate(-50%,-50%)}
  .performance-content{top:auto;left:auto;width:max-content;transform:none}
  .performance-content h2{margin:0;font-size:min(3.7977vw,7.7283svh);line-height:.91;font-weight:500;white-space:nowrap;transform:scaleX(1.09);transform-origin:left center}
  .performance-machine{top:auto;right:auto;bottom:auto;left:auto;width:min(5.4427vw,11.0758svh);max-width:none;max-height:none;transform:none}
  .reason-scene:nth-child(2) .photo-copy{top:min(25.21vw,44.82svh);left:1.88%;width:100%;transform:none}
  .reason-scene:nth-child(3) .photo-copy{top:min(25.21vw,44.82svh);left:.26%;width:100%;transform:none}
  .photo-copy h2,.photo-copy-center h2{margin:0;font-size:58.33px;line-height:1.2;font-weight:500;white-space:nowrap;transform:scaleX(1.09)}

  /* Match the About timeline's initial state: the title waits on the right
     until the guide wheel reaches it, rather than starting under the cursor. */
  .history-copy{top:24%;right:6.2%;left:auto;width:45%;padding:18px 0 20px}
  .history-copy .history-cn{display:none}
}

@media(max-width:900px){
  .hero-sound-toggle{bottom:22px;left:18px}
  .hero-ended::after{display:none}
  .hero-end-frame{object-position:40% center}
  .reason-tab-icon{display:none}
  .intro-copy h2{white-space:normal}
  .reason-list li>span{display:block;margin-top:4px}
}

/* Product chapter uses the PSD's separate English and Chinese heading anchors. */
.products{
  z-index:111;
  min-height:100svh;
  padding:clamp(72px,9svh,118px) 0 clamp(54px,7svh,92px);
  align-items:center;
  background:#f4f4f2;
}
.product-shell{width:min(72vw,1384px);max-width:none;margin:0 auto}
.product-heading{position:relative;display:block;min-height:56px;margin:0 0 clamp(24px,3.4vh,48px)}
.product-heading>.product-heading-en{position:absolute;top:0;left:4.2%;margin:0;color:#17191b;font-family:var(--ruijun-font-cn);font-size:clamp(38px,3.04vw,58px);font-weight:400;line-height:1}
.product-heading>.product-heading-cn{position:absolute;top:6px;left:31%;margin:0;color:var(--ruijun-red);font-size:clamp(24px,2.03vw,39px);font-weight:400;line-height:1}
.product-grid{gap:15px}
.product-card{aspect-ratio:420/259;border-radius:4px}
.product-card:focus-visible{outline:3px solid var(--ruijun-red);outline-offset:2px}
.product-card>div{bottom:14%;min-width:37%;padding:10px 12px 16px;background:rgb(48 52 55/78%)}
.product-card small{margin:0 0 2px;color:rgb(255 255 255/78%);font-size:10px;line-height:1.25}
.product-card h3{margin:0;font-size:17px;line-height:1.3;font-weight:600}

@media(max-width:900px){
  .products{z-index:auto;min-height:auto;padding:86px 20px 64px}
  .product-shell{width:100%}
  .product-heading{display:block;min-height:0;margin:0 0 24px}
  .product-heading>.product-heading-en,.product-heading>.product-heading-cn{position:static;display:block}
  .product-heading>.product-heading-en{font-size:32px}
  .product-heading>.product-heading-cn{margin-top:8px;font-size:18px}
  .product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:620px){
  .products{padding:58px 16px}
  .product-grid{grid-template-columns:1fr}
}

/* The PSD footer is its own 3896 x 1887 canvas, so it must remain in normal flow. */
.contact-panel{display:block;min-height:0}
.contact-panel>.contact-hero{position:relative;z-index:2;min-height:32svh;padding:5vh 7% 2.5vh;box-sizing:border-box}
@media(min-width:901px){
  .contact-panel.lifecycle-panel{height:auto;min-height:100svh;overflow:visible}
  .contact-panel :deep(.psd-footer){margin-top:max(-190px,-10vw)}
}
@media(max-width:900px){.contact-panel>.contact-hero{min-height:0;padding:100px 7% 60px}}

/* Homepage typography follows the 3840px "新网站首页.psd" source canvas. */
@media(min-width:901px){
  .home-page{--home-psd-cn:"AidianFengYaHei","Microsoft YaHei","PingFang SC",sans-serif;--home-psd-hero:"Source Han Sans CN","SourceHanSansCN-Medium","Microsoft YaHei",sans-serif;--home-psd-latin:"Calibri Light",Calibri,Arial,sans-serif}
  .hero-ended-link{font-family:var(--home-psd-hero)}
  .reason-intro .intro-copy{top:11.22vw;left:51.59%;width:43.1%;font-family:var(--home-psd-cn)}
  .reason-intro .intro-copy h2{margin:0 0 3.07vw;font-family:var(--home-psd-cn);font-size:2.5vw;line-height:1.13;font-weight:500;letter-spacing:0;white-space:nowrap}
  .reason-intro .intro-copy h2 span{margin-left:.21vw}
  .reason-intro .reason-list li{margin-bottom:2.18vw}
  .reason-intro .reason-list li:nth-child(2){margin-bottom:2.76vw}
  .reason-intro .reason-list b{font-family:var(--home-psd-cn);font-size:1.67vw!important;line-height:1.18;font-weight:500;letter-spacing:0}
  .reason-intro .reason-list li>span{margin-top:.76vw;font-family:var(--home-psd-cn);font-size:1.15vw!important;line-height:1.2;font-weight:500;letter-spacing:0}
  .reason-tabs{font-family:var(--home-psd-cn)}
  .reason-tabs a,.reason-tabs .reason-tab-label{font-family:var(--home-psd-cn);line-height:1.2;font-weight:500;letter-spacing:0}
  .performance-content h2{font-family:var(--home-psd-cn);line-height:.91;font-weight:500;letter-spacing:0}
  .reason-scene:nth-child(2) .photo-copy{top:24.56vw;left:0}
  .reason-scene:nth-child(3) .photo-copy{top:24.56vw;left:0}
  .photo-copy h2,.photo-copy-center h2{font-family:var(--home-psd-cn);font-size:2.74vw;line-height:1.2;font-weight:500;letter-spacing:0;transform:none}
  .products{padding-top:10.16vw;padding-bottom:5.42vw}
  .product-heading{min-height:3.15vw;margin-bottom:3.17vw}
  .product-heading>.product-heading-en{top:0;left:4.2%;font-family:Arial,"Helvetica Neue",sans-serif;font-size:3.15vw;font-weight:400;line-height:1}
  .product-heading>.product-heading-cn{top:.68vw;left:31%;font-family:var(--home-psd-cn);font-size:2.03vw;font-weight:500;line-height:1}
  .product-card small,.product-card h3{font-family:var(--home-psd-cn);letter-spacing:0}
  .history-copy{top:24%;right:6.2%;left:auto;width:45%;padding:18px 0 20px;font-family:var(--home-psd-latin)}
  .history-en{row-gap:.36vw!important;font-family:var(--home-psd-latin);font-size:3.04vw!important;line-height:1.12!important;font-weight:300;letter-spacing:.04em}
  .history-event b{font-family:var(--home-psd-latin);font-size:clamp(64px,4.17vw,82px);line-height:.94;font-weight:700;letter-spacing:.06em}
  .history-event span{font-family:SimSun,"Songti SC",serif;font-size:1.15vw;line-height:1.3;font-weight:400;letter-spacing:.08em}
}
.home-page .history {
  background-color: #f3f2ee;
  background-image: url('/assets/timeline-paper-texture.jpg');
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}
</style>
<style>
/* Keep timeline event copy together; narrow CMS/preview panes must not split
   Chinese characters and punctuation into separate lines. */
.history-track article > span { min-width: 280px; white-space: nowrap; overflow: visible; }
@media (max-width: 900px) { .history-track article > span { min-width: 190px; white-space: normal; word-break: keep-all; } }
</style>

<style>
html[data-cms-preview-edit-mode="true"] .hero-cms-copy [data-cms-preview-editable="true"]{pointer-events:auto;cursor:text}
/* The public homepage freezes on its ending frame. In the internal canvas,
   retain the real video above that frame so its controlled media binding can
   receive the selection click. */
html[data-cms-preview-edit-mode="true"] .hero.hero-ended .hero-end-frame{pointer-events:none}
html[data-cms-preview-edit-mode="true"] .hero.hero-ended .hero-video{opacity:1;pointer-events:auto}
</style>
