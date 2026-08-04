<script setup lang="ts">
import { filterProductModels } from '~/shared/product-model-filter.mjs';

const { data: response } = await useFetch('/api/public/v1/product-series', {
  default: () => ({ data: [] as Array<Record<string, unknown>>, source: 'static', cache: 'unavailable' })
});
const { data: modelsResponse } = await useFetch('/api/public/v1/products', {
  default: () => ({ data: [] as Array<Record<string, unknown>>, source: 'static', cache: 'unavailable' })
});

const series = computed(() => Array.isArray(response.value?.data) ? response.value.data : []);
const allModels = computed(() => Array.isArray(modelsResponse.value?.data) ? modelsResponse.value.data : []);
const modelQuery = ref('');
const filteredModels = computed(() => filterProductModels(allModels.value, modelQuery.value));
useSeoMeta({ title: '产品中心', description: '瑞钧智科中走丝线切割机床产品系列与应用场景。' });
</script>

<template>
  <main class="product-page">
    <SiteHeader />
    <section class="product-hero">
      <div><p>PRODUCT CENTER</p>
      <h1>中走丝设备<br>面向真实加工任务</h1>
      <span>覆盖自动化、高精度、一体机、大锥度与大型工件加工，按应用场景选择适合的设备平台。</span></div>
    </section>
    <section class="catalog" aria-labelledby="catalog-title">
      <div class="catalog-heading"><h2 id="catalog-title">产品系列</h2><p>从单机能力到自动化工作站，瑞钧围绕加工稳定性、效率和现场使用体验持续完善产品体系。</p></div>
      <div v-if="series.length" class="series-grid">
        <NuxtLink v-for="(item, index) in series" :key="String(item.series_code)" class="series-card" :to="`/product/detail?series=${encodeURIComponent(String(item.series_code))}`">
          <span>{{ String(index + 1).padStart(2, '0') }} / PRODUCT SERIES</span>
          <h3>{{ item.name }}</h3>
          <p>{{ item.positioning || '产品资料已发布，具体配置请联系瑞钧。' }}</p>
          <b>查看型号</b>
        </NuxtLink>
      </div>
      <p v-else class="empty-state">产品资料正在审核中。请联系瑞钧获取选型建议与可公开的技术资料。</p>
    </section>
    <section class="model-search" aria-labelledby="model-search-title">
      <div class="search-heading"><p>MODEL FINDER</p><h2 id="model-search-title">按型号检索</h2></div>
      <label class="search-field">
        <span class="sr-only">输入型号、名称或系列</span>
        <input v-model="modelQuery" type="search" maxlength="80" autocomplete="off" placeholder="输入型号、名称或系列，例如 FR400XS">
      </label>
      <div v-if="filteredModels.length" class="product-model-results" aria-live="polite">
        <NuxtLink v-for="model in filteredModels" :key="String(model.model_code)" :to="model.slug ? `/product/${model.slug}` : `/product/detail?series=${encodeURIComponent(String(model.series_code || ''))}`">
          <span>{{ model.series_code || 'PRODUCT SERIES' }}</span>
          <strong>{{ model.model_code }}</strong>
          <p>{{ model.name || '公开型号资料' }}</p>
        </NuxtLink>
      </div>
      <p v-else class="empty-state model-empty" aria-live="polite">{{ modelQuery ? '未找到匹配的已发布型号。请联系瑞钧获取选型建议。' : '已发布型号资料正在审核中。请联系瑞钧获取选型建议。' }}</p>
    </section>
    <SiteFooter />
  </main>
</template>

<style scoped>
.product-page{min-height:100vh;background:var(--ruijun-paper);color:#161719}.product-hero{position:relative;min-height:68svh;display:flex;align-items:flex-end;padding:150px 6.2% 8vh;overflow:hidden;background:#edf2f3 url('/assets/psd/product-workstation.png') left center/auto 100% no-repeat}.product-hero::after{content:"";position:absolute;inset:0;background:rgb(244 247 247/12%)}.product-hero>div{position:relative;z-index:1;width:48%;margin-left:auto}.product-hero p,.catalog-heading p,.search-heading p,.series-card>span{margin:0;color:var(--ruijun-red);font-size:12px}.product-hero h1{max-width:760px;margin:16px 0 0;font-size:clamp(58px,6.1vw,88px);line-height:1.02;font-weight:600}.product-hero span{display:block;max-width:650px;margin-top:24px;color:#606469;font-size:17px}.catalog,.model-search{width:min(var(--ruijun-max),calc(100% - 12.4%));margin:0 auto;padding:90px 0}.catalog-heading,.search-heading{display:grid;grid-template-columns:minmax(220px,.7fr) minmax(0,1.3fr);gap:8vw;align-items:end;margin-bottom:50px}.catalog-heading h2,.search-heading h2{margin:0;font-size:54px;line-height:1.12;font-weight:600}.catalog-heading p,.search-heading p{align-self:start}.series-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.series-card{min-height:290px;padding:26px;display:flex;flex-direction:column;color:#161719;background:#e7e9e9;border:1px solid #d1d3d2;border-radius:4px;text-decoration:none;transition:transform .28s ease,box-shadow .28s ease}.series-card:hover{transform:translateY(-5px);box-shadow:0 16px 32px rgb(20 28 34/12%)}.series-card h3{margin:54px 0 12px;font-size:28px}.series-card p{color:#666a6e}.series-card b{margin-top:auto;color:var(--ruijun-red);font-size:13px}.empty-state{max-width:680px;margin:0;padding:30px 0;color:#5d6265;border-top:1px solid var(--ruijun-line);line-height:1.8}.model-search{padding-top:30px}.search-field{display:block;max-width:720px}.search-field input{width:100%;padding:16px 0;color:#17191b;background:transparent;border:0;border-bottom:1px solid #9ea09e;outline:none;font-size:22px}.search-field input:focus{border-color:var(--ruijun-red)}.search-field input::placeholder{color:#8b8e92}.product-model-results{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;margin-top:32px;background:#d1d3d2;border:1px solid #d1d3d2}.product-model-results a{min-height:180px;padding:24px;display:grid;gap:8px;background:#f4f4f2;color:#17191b;text-decoration:none}.product-model-results a:hover{background:#fff}.product-model-results span{color:var(--ruijun-red);font-size:12px}.product-model-results strong{font-size:28px}.product-model-results p{margin:0;color:#6f7276}.model-empty{margin-top:32px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:900px){.product-hero{min-height:62svh;padding:120px 22px 58px;background-position:36% center}.product-hero::after{background:rgb(244 247 247/78%)}.product-hero>div{width:100%;margin:0}.product-hero h1{font-size:50px}.product-hero span{font-size:15px}.catalog,.model-search{width:auto;margin:0;padding:62px 22px}.catalog-heading,.search-heading{grid-template-columns:1fr;gap:18px;margin-bottom:34px}.catalog-heading h2,.search-heading h2{font-size:38px}.series-grid,.product-model-results{grid-template-columns:1fr}.series-card{min-height:225px}.search-field input{font-size:18px}.product-model-results a{min-height:150px}}
.catalog-heading p{align-self:end;max-width:670px;margin:0;color:#777b7f;font-size:15px;line-height:1.75}
</style>
