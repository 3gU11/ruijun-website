<script setup lang="ts">
import { buildComparisonRows, toggleComparedModel } from '~/shared/product-compare.mjs';

const route = useRoute();
const seriesCode = computed(() => typeof route.query.series === 'string' ? route.query.series : '');
const { data: response } = await useFetch(() => `/api/public/v1/product-models?series=${encodeURIComponent(seriesCode.value)}`, {
  watch: [seriesCode], default: () => ({ data: [] as Array<Record<string, unknown>>, source: 'static', cache: 'unavailable' })
});
const models = computed(() => Array.isArray(response.value?.data) ? response.value.data : []);
const parameterLabels: Record<string, string> = { xyTravelMm: '工作台行程（X x Y）', zAxisTravelMm: 'Z 轴行程', maxWorkpieceMm: '最大工件尺寸', maxWorkpieceWeightKg: '最大工件重量（kg）', maxCuttingHeightMm: '最大切割高度（mm）', maxTaperDegrees: '最大锥度（度）', machineDimensionsMm: '机床外形尺寸', machineWeightKg: '机床重量（kg）' };
const selectedCodes = ref<string[]>([]);
const comparedModels = computed(() => models.value.filter((model) => selectedCodes.value.includes(String(model.model_code || ''))));
const comparisonRows = computed(() => buildComparisonRows(comparedModels.value, parameterLabels));

function toggleComparison(model: Record<string, unknown>) {
  selectedCodes.value = toggleComparedModel(selectedCodes.value, String(model.model_code || ''));
}

function clearComparison() {
  selectedCodes.value = [];
}

useSeoMeta({ title: '产品型号', description: '瑞钧智科已发布中走丝线切割机床型号和技术参数。' });
</script>

<template>
  <main class="model-page"><SiteHeader />
    <section class="model-intro"><NuxtLink to="/product">产品中心</NuxtLink><p>PRODUCT MODELS</p><h1>已发布型号<br>面向真实加工任务</h1></section>
    <section class="models" aria-labelledby="models-title"><h2 id="models-title">系列型号</h2>
      <div v-if="models.length" class="model-grid"><article v-for="model in models" :key="String(model.model_code)" class="model-card"><div><p>{{ model.model_code }}</p><h3>{{ model.name }}</h3></div><dl v-if="model.parameters"><template v-for="(value, key) in model.parameters" :key="String(key)"><dt v-if="parameterLabels[String(key)]">{{ parameterLabels[String(key)] }}</dt><dd v-if="parameterLabels[String(key)]">{{ value }}</dd></template></dl><div class="card-actions"><label class="compare-choice"><input type="checkbox" :checked="selectedCodes.includes(String(model.model_code || ''))" @change="toggleComparison(model)"><span>加入对比</span></label><NuxtLink v-if="model.slug" :to="`/product/${model.slug}`">查看详情</NuxtLink></div></article></div>
      <aside v-if="selectedCodes.length" class="comparison-panel" aria-live="polite"><div class="comparison-heading"><div><p>MODEL COMPARISON</p><h3>型号参数对比 <span>{{ selectedCodes.length }} / 3</span></h3></div><button type="button" @click="clearComparison">清空</button></div><p v-if="selectedCodes.length < 2" class="comparison-hint">再选择一台已发布型号即可开始对比。</p><div v-else class="comparison-table-wrap"><table><thead><tr><th scope="col">参数</th><th v-for="model in comparedModels" :key="String(model.model_code)" scope="col">{{ model.name || model.model_code }}</th></tr></thead><tbody><tr v-for="row in comparisonRows" :key="row.key"><th scope="row">{{ row.label }}</th><td v-for="(value, index) in row.values" :key="`${row.key}-${index}`">{{ value || '—' }}</td></tr></tbody></table><p v-if="!comparisonRows.length" class="comparison-hint">所选型号暂未发布可对比的结构化参数。</p></div></aside>
      <p v-else class="empty-state">请选择已发布产品系列，或联系瑞钧获取选型建议。</p>
    </section>
    <PsdFooter />
  </main>
</template>

<style scoped>
.model-page { min-height: 100vh; background: #090909; color: #fff; font-family: Arial, "Microsoft YaHei", sans-serif; }.model-intro, .models { max-width: 1280px; margin: 0 auto; padding-left: 32px; padding-right: 32px; }.model-intro { min-height: 46vh; padding-top: 92px; background: url('/assets/psd/product-fl-xs.png') right 12% bottom / min(44vw, 580px) auto no-repeat; }.model-intro > a { color: rgb(255 255 255 / 55%); font-size: 13px; text-decoration: none; }.model-intro p { margin: 66px 0 10px; color: #d22323; font-size: 12px; }h1 { margin: 0; font-size: clamp(44px, 6vw, 74px); line-height: 1.06; font-weight: 500; } .models { padding-top: 60px; padding-bottom: 100px; }h2 { margin: 0 0 26px; font-size: 32px; font-weight: 500; }.model-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; background: rgb(255 255 255 / 22%); }.model-card { min-height: 300px; padding: 30px; display: flex; flex-direction: column; background: #090909; }.model-card p { margin: 0; color: #d22323; font-size: 13px; }.model-card h3 { margin: 12px 0 30px; font-size: 30px; font-weight: 500; }.model-card dl { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 9px 24px; margin: 0; color: rgb(255 255 255 / 62%); font-size: 13px; }.model-card dd { margin: 0; color: #fff; text-align: right; }.model-card > a { margin-top: auto; color: #fff; font-size: 13px; text-decoration: none; }.empty-state { color: rgb(255 255 255 / 70%); }.model-card > a:hover { color: #ff5252; } @media (max-width: 760px) { .model-intro, .models { padding-left: 20px; padding-right: 20px; }.model-intro { min-height: 52vh; background-size: 74vw auto; background-position: 100% 10%; }.model-grid { grid-template-columns: 1fr; }.model-card { min-height: 270px; } }
.card-actions { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: auto; padding-top: 28px; }.card-actions > a { color: #fff; font-size: 13px; text-decoration: none; }.card-actions > a:hover { color: #ff5252; }.compare-choice { display: inline-flex; align-items: center; gap: 8px; color: rgb(255 255 255 / 75%); font-size: 13px; cursor: pointer; }.compare-choice input { width: 16px; height: 16px; accent-color: #d22323; }.comparison-panel { margin-top: 44px; border: 1px solid rgb(255 255 255 / 25%); }.comparison-heading { display: flex; justify-content: space-between; align-items: end; gap: 24px; padding: 24px 28px; border-bottom: 1px solid rgb(255 255 255 / 18%); }.comparison-heading p { margin: 0 0 8px; color: #d22323; font-size: 12px; }.comparison-heading h3 { margin: 0; font-size: 24px; font-weight: 500; }.comparison-heading h3 span { margin-left: 8px; color: rgb(255 255 255 / 55%); font-size: 14px; font-weight: 400; }.comparison-heading button { border: 0; background: transparent; color: rgb(255 255 255 / 74%); cursor: pointer; font: inherit; }.comparison-heading button:hover { color: #ff5252; }.comparison-hint { margin: 0; padding: 22px 28px; color: rgb(255 255 255 / 65%); line-height: 1.7; }.comparison-table-wrap { overflow-x: auto; }.comparison-table-wrap table { width: 100%; min-width: 620px; border-collapse: collapse; }.comparison-table-wrap th, .comparison-table-wrap td { padding: 17px 28px; border-top: 1px solid rgb(255 255 255 / 14%); text-align: left; font-size: 14px; }.comparison-table-wrap thead th { border-top: 0; color: #fff; font-weight: 500; }.comparison-table-wrap tbody th { width: 32%; color: rgb(255 255 255 / 60%); font-weight: 400; }.comparison-table-wrap td { color: #fff; } @media (max-width: 760px) { .comparison-heading { padding: 20px; align-items: start; }.comparison-hint { padding: 20px; }.comparison-table-wrap th, .comparison-table-wrap td { padding: 15px 20px; } }
</style>

<style scoped>
.model-page { min-height: 100vh; background: var(--ruijun-paper); color: var(--ruijun-ink); }
.model-intro { max-width: none; min-height: 68svh; display: flex; flex-direction: column; justify-content: flex-end; margin: 0; padding: 150px 6.2% 8vh; background: #edf2f3 url('/assets/psd/product-workstation.png') left center / auto 100% no-repeat; }
.model-intro > * { width: 48%; margin-left: auto; }
.model-intro > a { color: #686c70; font-size: 13px; text-decoration: none; }
.model-intro > a:hover { color: var(--ruijun-red); }
.model-intro p { margin-top: 48px; margin-bottom: 12px; color: var(--ruijun-red); font-size: 12px; font-weight: 700; }
.model-intro h1 { margin-top: 0; margin-bottom: 0; font-size: clamp(54px, 6vw, 82px); line-height: 1.04; font-weight: 600; }
.models { width: min(var(--ruijun-max), calc(100% - 12.4%)); max-width: none; margin: 0 auto; padding: 90px 0 110px; }
.models > h2 { margin: 0 0 42px; font-size: 46px; line-height: 1.1; font-weight: 600; }
.model-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; background: transparent; }
.model-card { min-height: 300px; padding: 30px; display: flex; flex-direction: column; background: #f7f8f7; border: 1px solid var(--ruijun-line); }
.model-card p { margin: 0; color: var(--ruijun-red); font-size: 12px; font-weight: 700; }
.model-card h3 { margin: 12px 0 30px; color: #17191b; font-size: 30px; font-weight: 600; }
.model-card dl { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px 24px; margin: 0; color: #686c70; font-size: 13px; }
.model-card dd { margin: 0; color: #17191b; text-align: right; }
.empty-state { max-width: 680px; margin: 0; padding: 30px 0; color: #5d6265; border-top: 1px solid var(--ruijun-line); line-height: 1.8; }
.card-actions > a { color: var(--ruijun-red); font-weight: 700; }
.card-actions > a:hover { color: #b91920; }
.compare-choice { color: #616569; }
.comparison-panel { background: #f7f8f7; border-color: var(--ruijun-line); }
.comparison-heading { border-color: var(--ruijun-line); }
.comparison-heading h3 { color: #17191b; font-weight: 600; }
.comparison-heading h3 span, .comparison-heading button, .comparison-hint { color: #676b6f; }
.comparison-table-wrap th, .comparison-table-wrap td { border-color: var(--ruijun-line); }
.comparison-table-wrap thead th, .comparison-table-wrap td { color: #17191b; }
.comparison-table-wrap tbody th { color: #686c70; }
@media (max-width: 900px) {
  .model-intro { position: relative; min-height: 62svh; padding: 112px 22px 58px; background-position: 34% center; }
  .model-intro::before { content: ""; position: absolute; inset: 0; background: rgb(244 247 247 / 78%); }
  .model-intro > * { position: relative; width: 100%; margin-left: 0; }
  .model-intro h1 { font-size: 48px; }
  .models { width: auto; margin: 0; padding: 64px 22px 76px; }
  .models > h2 { font-size: 38px; }
  .model-grid { grid-template-columns: 1fr; }
}
@media (max-width: 760px) { .model-card { min-height: 270px; padding: 24px; } }
</style>
