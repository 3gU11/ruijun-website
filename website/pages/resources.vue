<script setup lang="ts">
import { filterServiceResources } from '~/shared/service-resource-filter.mjs';

const modelQuery = ref('');
const { data: resourceResponse } = await useFetch('/api/public/v1/service-resources', {
  default: () => ({ data: [] as Array<Record<string, unknown>> })
});
const { data: locationResponse } = await useFetch('/api/public/v1/service-locations', {
  default: () => ({ data: [] as Array<Record<string, unknown>> })
});
const resources = computed(() => Array.isArray(resourceResponse.value?.data) ? resourceResponse.value.data : []);
const locations = computed(() => Array.isArray(locationResponse.value?.data) ? locationResponse.value.data : []);
const filteredResources = computed(() => filterServiceResources(resources.value, modelQuery.value));

function resourceLink(asset: unknown) {
  const value = String(asset || '').trim();
  return value.startsWith('/') || /^https?:\/\//i.test(value) ? value : '';
}

function contactPhone(location: Record<string, any>) {
  return String(location?.contact?.phone || '').trim();
}

useSeoMeta({ title: '服务资料与网点', description: '查找瑞钧智科已发布的机型服务资料和服务网点。' });
</script>

<template>
  <main class="resources-page">
    <SiteHeader />
    <section class="resources-hero"><p>SERVICE LIBRARY</p><h1>服务资料<br>与支持网点</h1><span>按设备型号查找已审核发布的服务资料；需要人工协助时，可直接进入服务支持。</span><NuxtLink to="/service">进入服务支持</NuxtLink></section>
    <section class="resource-search" aria-labelledby="resource-search-title">
      <div class="section-heading"><p>MODEL SEARCH</p><h2 id="resource-search-title">按型号查找资料</h2></div>
      <label class="model-search-input"><span>设备型号</span><input v-model="modelQuery" type="search" maxlength="80" autocomplete="off" placeholder="例如 FR400XS" aria-describedby="model-search-hint"></label>
      <p id="model-search-hint" class="search-hint">留空显示全部已发布资料。输入内容仅在当前页面筛选，不会提交或保存。</p>
      <ul v-if="filteredResources.length" class="resource-list"><li v-for="resource in filteredResources" :key="String(resource.source_key)"><div><p>{{ resource.type || 'SERVICE RESOURCE' }}</p><h3>{{ Array.isArray(resource.applicable_models) && resource.applicable_models.length ? resource.applicable_models.join(' / ') : '通用服务资料' }}</h3><span>{{ resource.version || '当前发布版本' }}</span></div><a v-if="resourceLink(resource.asset)" :href="resourceLink(resource.asset)" target="_blank" rel="noopener noreferrer">查看资料</a></li></ul>
      <p v-else class="empty-state">没有与该型号匹配的已发布资料。请联系服务支持获取帮助。</p>
    </section>
    <section v-if="locations.length" class="locations" aria-labelledby="locations-title"><div class="section-heading"><p>SERVICE LOCATIONS</p><h2 id="locations-title">服务网点</h2></div><ul><li v-for="location in locations" :key="String(location.source_key)"><div><h3>{{ [location.region, location.city].filter(Boolean).join(' ') }}</h3><p>{{ location.service_scope }}</p></div><a v-if="contactPhone(location)" :href="`tel:${contactPhone(location).replace(/\s/g, '')}`">{{ contactPhone(location) }}</a></li></ul></section>
    <SiteFooter variant="full" />
  </main>
</template>

<style scoped>
.resources-page { min-height: 100vh; background: #0a0a0a; color: #fff; font-family: Arial, "Microsoft YaHei", sans-serif; }.resources-hero, .resource-search, .locations { max-width: 1216px; margin: 0 auto; padding-left: 32px; padding-right: 32px; }.resources-hero { min-height: 54vh; display: flex; flex-direction: column; justify-content: end; padding-bottom: 74px; background: url('/assets/docx-service.jpg') right center / auto 100% no-repeat; }.resources-hero p, .section-heading > p, .resource-list p { margin: 0; color: #e33232; font-size: 12px; }.resources-hero h1 { margin: 18px 0; font-size: clamp(48px, 6vw, 82px); line-height: 1.04; font-weight: 500; }.resources-hero span { max-width: 480px; color: rgb(255 255 255 / 72%); line-height: 1.8; }.resources-hero a { width: fit-content; margin-top: 28px; padding: 12px 16px; border: 1px solid rgb(255 255 255 / 55%); color: #fff; text-decoration: none; }.resource-search, .locations { padding-top: 90px; padding-bottom: 32px; }.section-heading h2 { margin: 10px 0 28px; font-size: 32px; font-weight: 500; }.model-search-input { display: grid; gap: 10px; max-width: 520px; color: rgb(255 255 255 / 75%); font-size: 14px; }.model-search-input input { height: 48px; padding: 0 14px; border: 1px solid rgb(255 255 255 / 35%); border-radius: 0; background: transparent; color: #fff; font: inherit; }.search-hint, .empty-state { color: rgb(255 255 255 / 62%); font-size: 14px; line-height: 1.7; }.resource-list, .locations ul { margin: 46px 0 0; padding: 0; border-top: 1px solid rgb(255 255 255 / 25%); list-style: none; }.resource-list li, .locations li { display: flex; align-items: center; justify-content: space-between; gap: 28px; padding: 24px 0; border-bottom: 1px solid rgb(255 255 255 / 18%); }.resource-list h3, .locations h3 { margin: 9px 0; font-size: 21px; font-weight: 500; }.resource-list span, .locations p { color: rgb(255 255 255 / 60%); font-size: 14px; }.resource-list a, .locations a { padding: 10px 14px; border: 1px solid rgb(255 255 255 / 38%); color: #fff; text-decoration: none; white-space: nowrap; }.locations { padding-top: 70px; padding-bottom: 110px; }.locations h3 { margin-top: 0; }.locations p { margin: 0; line-height: 1.7; } @media (max-width: 760px) { .resources-hero, .resource-search, .locations { padding-left: 20px; padding-right: 20px; }.resources-hero { min-height: 58vh; background-size: auto 74%; background-position: right top; }.resource-search { padding-top: 64px; }.resource-list li, .locations li { align-items: start; flex-direction: column; gap: 18px; }.locations { padding-top: 52px; padding-bottom: 72px; } }
</style>

<style scoped>
@media (max-width: 760px) { .resources-hero { min-height: 48vh; background-image: none; } }
</style>

<style scoped>
.resources-page { min-height: 100vh; background: var(--ruijun-paper); color: var(--ruijun-ink); }
.resources-hero { position: relative; max-width: none; min-height: 64svh; display: flex; flex-direction: column; justify-content: flex-end; overflow: hidden; margin: 0; padding: 150px 6.2% 8vh; isolation: isolate; color: #fff; background: #202426 url('/assets/service-library-hero.jpg') center / cover no-repeat; }
.resources-hero::before { content: ""; position: absolute; z-index: -1; inset: 0; background: rgb(10 11 12 / 46%); }
.resources-hero p, .section-heading > p, .resource-list p { color: var(--ruijun-red); font-weight: 700; }
.resources-hero h1 { font-weight: 600; }
.resources-hero span { max-width: 540px; color: rgb(255 255 255 / 82%); font-size: 16px; }
.resources-hero a { color: #fff; background: var(--ruijun-red); border-color: var(--ruijun-red); }
.resource-search, .locations { width: min(var(--ruijun-max), calc(100% - 12.4%)); max-width: none; margin: 0 auto; padding-right: 0; padding-left: 0; }
.section-heading { display: grid; grid-template-columns: minmax(220px, .7fr) minmax(0, 1.3fr); gap: 8vw; align-items: end; margin-bottom: 42px; }
.section-heading h2 { margin: 0; color: #17191b; font-size: 46px; font-weight: 600; }
.model-search-input { color: #62666a; }
.model-search-input input { height: 52px; padding: 0 15px; border-color: #b8bbb9; background: #f8f9f8; color: #17191b; }
.model-search-input input:focus { border-color: var(--ruijun-red); outline: 1px solid var(--ruijun-red); }
.search-hint, .empty-state { color: #666a6e; }
.resource-list, .locations ul { border-color: var(--ruijun-line); }
.resource-list li, .locations li { border-color: var(--ruijun-line); }
.resource-list h3, .locations h3 { color: #17191b; font-weight: 600; }
.resource-list span, .locations p { color: #686c70; }
.resource-list a, .locations a { color: #17191b; border-color: #8b8e91; }
.resource-list a:hover, .locations a:hover { color: #fff; background: var(--ruijun-red); border-color: var(--ruijun-red); }
@media (max-width: 900px) {
  .resources-hero { min-height: 58svh; padding: 112px 22px 58px; }
  .resources-hero h1 { font-size: 48px; }
  .resource-search, .locations { width: auto; margin: 0; padding-right: 22px; padding-left: 22px; }
  .section-heading { grid-template-columns: 1fr; gap: 14px; }
  .section-heading h2 { font-size: 38px; }
}
@media (max-width: 760px) {
  .resources-hero { min-height: 54svh; background-image: url('/assets/service-library-hero.jpg'); background-position: 45% center; }
}
</style>
