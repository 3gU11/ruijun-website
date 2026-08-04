<script setup lang="ts">
const route = useRoute();
const slug = computed(() => String(route.params.slug || ''));
const { data: response } = await useFetch(() => `/api/public/v1/products/${encodeURIComponent(slug.value)}`, {
  watch: [slug], default: () => ({ data: null as Record<string, unknown> | null, source: 'static', cache: 'unavailable' })
});
const product = computed(() => response.value?.data || null);
const parameters = computed(() => product.value?.parameters && typeof product.value.parameters === 'object' ? Object.entries(product.value.parameters as Record<string, unknown>) : []);
type RelatedResource = { title: string; type?: string; url: string };
type CaseStudy = { title: string; summary?: string; url: string };
const resources = computed(() => Array.isArray(product.value?.resources) ? product.value.resources as RelatedResource[] : []);
const caseStudies = computed(() => Array.isArray(product.value?.case_studies) ? product.value.case_studies as CaseStudy[] : []);
useSeoMeta({ title: () => String(product.value?.name || '产品详情'), description: '瑞钧智科中走丝线切割机床产品参数与配置。' });
</script>

<template>
  <main class="detail-page"><SiteHeader />
    <template v-if="product"><section class="detail-layout"><div class="detail-copy"><NuxtLink to="/product">产品中心</NuxtLink><p>{{ product.model_code }}</p><h1>{{ product.name }}</h1><span>公开技术参数以当前发布版本为准；请结合加工任务向瑞钧确认最终配置。</span><NuxtLink class="contact" to="/service">获取选型方案</NuxtLink></div><div class="parameter-panel"><h2>技术参数</h2><dl><template v-for="[key, value] in parameters" :key="key"><dt>{{ key }}</dt><dd>{{ value }}</dd></template></dl></div></section><section v-if="resources.length || caseStudies.length" class="product-related"><div v-if="resources.length" class="related-group"><p>PRODUCT RESOURCES</p><h2>资料与视频</h2><a v-for="resource in resources" :key="resource.url" :href="resource.url" :target="resource.url.startsWith('https://') ? '_blank' : undefined" :rel="resource.url.startsWith('https://') ? 'noreferrer' : undefined"><span>{{ resource.type || '资料' }}</span><strong>{{ resource.title }}</strong><i aria-hidden="true">↗</i></a></div><div v-if="caseStudies.length" class="related-group"><p>APPLICATION CASES</p><h2>关联案例</h2><a v-for="caseStudy in caseStudies" :key="caseStudy.url" :href="caseStudy.url" :target="caseStudy.url.startsWith('https://') ? '_blank' : undefined" :rel="caseStudy.url.startsWith('https://') ? 'noreferrer' : undefined"><strong>{{ caseStudy.title }}</strong><span v-if="caseStudy.summary">{{ caseStudy.summary }}</span><i aria-hidden="true">↗</i></a></div></section></template>
    <section v-else class="not-found"><p>PRODUCT DETAIL</p><h1>该型号资料暂未发布</h1><NuxtLink to="/product">返回产品中心</NuxtLink></section>
    <SiteFooter />
  </main>
</template>

<style scoped>
.detail-page { min-height: 100vh; background: #090909; color: #fff; font-family: Arial, "Microsoft YaHei", sans-serif; }.detail-layout, .not-found { max-width: 1280px; min-height: calc(100vh - 79px); margin: 0 auto; padding: 70px 32px; }.detail-layout { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(300px, .95fr); align-items: center; gap: 72px; }.detail-copy > a { color: rgb(255 255 255 / 55%); text-decoration: none; font-size: 13px; }.detail-copy > p, .not-found > p { color: #d22323; font-size: 12px; margin: 58px 0 14px; }.detail-copy h1, .not-found h1 { margin: 0; font-size: clamp(48px, 7vw, 86px); line-height: 1.02; font-weight: 500; }.detail-copy span { display: block; max-width: 440px; margin-top: 26px; color: rgb(255 255 255 / 70%); line-height: 1.8; }.contact, .not-found > a { display: inline-block; margin-top: 36px; padding: 13px 18px; background: #d22323; color: #fff; text-decoration: none; }.parameter-panel { padding: 36px; border: 1px solid rgb(255 255 255 / 22%); }.parameter-panel h2 { margin: 0 0 28px; font-size: 23px; font-weight: 500; }.parameter-panel dl { margin: 0; }.parameter-panel dt, .parameter-panel dd { padding: 14px 0; border-top: 1px solid rgb(255 255 255 / 15%); font-size: 14px; }.parameter-panel dt { color: rgb(255 255 255 / 62%); }.parameter-panel dd { margin: 0; color: #fff; }.not-found { display: flex; flex-direction: column; justify-content: center; } @media (max-width: 760px) { .detail-layout, .not-found { padding: 48px 20px; }.detail-layout { grid-template-columns: 1fr; gap: 46px; }.parameter-panel { padding: 24px; } }
.product-related { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px; max-width: 1280px; margin: 0 auto; padding: 0 32px 110px; }.related-group { border-top: 1px solid rgb(255 255 255 / 22%); }.related-group > p { margin: 22px 0 9px; color: #d22323; font-size: 12px; }.related-group > h2 { margin: 0 0 26px; font-size: 28px; font-weight: 500; }.related-group > a { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 18px; padding: 18px 26px 18px 0; border-top: 1px solid rgb(255 255 255 / 14%); color: #fff; text-decoration: none; }.related-group > a > strong { font-weight: 500; }.related-group > a > span { grid-column: 1; color: rgb(255 255 255 / 60%); font-size: 13px; line-height: 1.5; }.related-group > a > i { grid-column: 2; grid-row: 1 / span 2; align-self: center; color: #d22323; font-style: normal; }.related-group > a:hover strong { color: #ff5252; } @media (max-width: 760px) { .product-related { grid-template-columns: 1fr; gap: 46px; padding: 0 20px 70px; } }
</style>

<style scoped>
.detail-page { min-height: 100vh; display: flex; flex-direction: column; background: var(--ruijun-paper); color: var(--ruijun-ink); }
.detail-layout, .not-found { width: min(var(--ruijun-max), calc(100% - 12.4%)); max-width: none; min-height: 76svh; margin: 0 auto; padding: 142px 0 90px; }
.detail-layout { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(320px, .95fr); align-items: center; gap: 8vw; }
.detail-copy > a { color: #676b6f; }
.detail-copy > a:hover { color: var(--ruijun-red); }
.detail-copy > p, .not-found > p { color: var(--ruijun-red); font-weight: 700; }
.detail-copy h1, .not-found h1 { color: #17191b; font-weight: 600; }
.detail-copy span { color: #686c70; }
.contact, .not-found > a { background: var(--ruijun-red); color: #fff !important; }
.parameter-panel { background: #f7f8f7; border-color: var(--ruijun-line); }
.parameter-panel h2 { color: #17191b; font-weight: 600; }
.parameter-panel dt, .parameter-panel dd { border-color: var(--ruijun-line); }
.parameter-panel dt { color: #686c70; }
.parameter-panel dd { color: #17191b; }
.not-found { display: flex; flex: 1; flex-direction: column; justify-content: center; padding-left: 52%; background: #edf2f3 url('/assets/psd/product-workstation.png') left center / 52% auto no-repeat; }
.product-related { width: min(var(--ruijun-max), calc(100% - 12.4%)); max-width: none; gap: 54px; padding-right: 0; padding-left: 0; }
.related-group { border-color: var(--ruijun-line); }
.related-group > p { color: var(--ruijun-red); }
.related-group > h2 { color: #17191b; font-weight: 600; }
.related-group > a { color: #17191b; border-color: var(--ruijun-line); }
.related-group > a > strong { font-weight: 600; }
.related-group > a > span { color: #686c70; }
.related-group > a > i { color: var(--ruijun-red); }
.related-group > a:hover strong { color: var(--ruijun-red); }
@media (max-width: 760px) {
  .detail-layout, .not-found { width: auto; min-height: auto; padding: 76px 20px; }
  .not-found { min-height: 64svh; padding-top: 160px; background-position: center top 40px; background-size: 100% auto; }
  .product-related { width: auto; padding-right: 20px; padding-left: 20px; }
}
</style>
