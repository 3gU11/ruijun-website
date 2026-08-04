<template>
  <private-view title="产品技术审核">
    <div class="review-page">
      <header class="toolbar">
        <div>
          <p class="eyebrow">PRODUCT REVIEW</p>
          <h2>产品草稿审核准备</h2>
          <p>显示当前账号可读取的产品草稿问题；请在原生内容详情中补全并走既有审核流程。</p>
        </div>
        <button type="button" :disabled="loading" @click="loadRecords">刷新</button>
      </header>

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div v-if="loading" class="empty">正在读取产品草稿...</div>
      <div v-else-if="!models.length && !series.length" class="empty">暂无可读取的产品草稿，或当前账号没有产品审核权限。</div>
      <template v-else>
        <section class="summary" aria-label="产品审核概览">
          <div><span>产品系列</span><strong>{{ series.length }}</strong></div>
          <div><span>产品型号</span><strong>{{ models.length }}</strong></div>
          <div><span>需处理型号</span><strong>{{ flaggedModels.length }}</strong></div>
        </section>
        <section v-if="flaggedSeries.length" class="panel" aria-label="产品系列审核项">
          <h3>产品系列</h3>
          <ul><li v-for="item in flaggedSeries" :key="item.id"><strong>{{ item.name || item.series_code || '未命名系列' }}</strong><span>{{ item.issues.join('；') }}</span></li></ul>
        </section>
        <section class="panel" aria-label="产品型号审核项">
          <h3>产品型号</h3>
          <div v-if="!flaggedModels.length" class="empty compact">当前可读取型号没有自动识别的缺项或冲突。</div>
          <table v-else>
            <thead><tr><th>型号</th><th>系列</th><th>审核提示</th><th>状态</th></tr></thead>
            <tbody><tr v-for="item in flaggedModels" :key="item.id"><td>{{ item.name || item.model_code || '未命名型号' }}</td><td>{{ item.series_code || '未填写' }}</td><td>{{ item.issues.join('；') }}</td><td>{{ item.status || '未知' }}/{{ item.publication_state || '未知' }}</td></tr></tbody>
          </table>
        </section>
      </template>
    </div>
  </private-view>
</template>

<script setup>
import { useApi } from '@directus/extensions-sdk';
import { computed, onMounted, ref } from 'vue';
import { assessProductModel, assessProductSeries, sortProductRecords } from '../../../reports/product-review-rules.mjs';

const api = useApi();
const series = ref([]);
const models = ref([]);
const loading = ref(false);
const error = ref('');
const seriesFields = ['id', 'series_code', 'name', 'source_url', 'source_document', 'import_evidence', 'status', 'publication_state'].join(',');
const modelFields = ['id', 'series_code', 'model_code', 'name', 'source_url', 'source_document', 'parameters', 'import_evidence', 'status', 'publication_state'].join(',');
const flaggedSeries = computed(() => sortProductRecords(series.value.map((item) => ({ ...item, issues: assessProductSeries(item) })).filter((item) => item.issues.length), (item) => item.issues, (item) => item.name || item.series_code || ''));
const flaggedModels = computed(() => sortProductRecords(models.value.map((item) => ({ ...item, issues: assessProductModel(item) })).filter((item) => item.issues.length), (item) => item.issues, (item) => item.name || item.model_code || ''));

async function loadRecords() {
  loading.value = true;
  error.value = '';
  try {
    const [seriesResponse, modelsResponse] = await Promise.all([
      api.get(`/items/product_series?fields=${encodeURIComponent(seriesFields)}&limit=-1`),
      api.get(`/items/product_models?fields=${encodeURIComponent(modelFields)}&limit=-1`)
    ]);
    series.value = Array.isArray(seriesResponse.data?.data) ? seriesResponse.data.data : [];
    models.value = Array.isArray(modelsResponse.data?.data) ? modelsResponse.data.data : [];
  } catch (reason) {
    series.value = [];
    models.value = [];
    error.value = reason?.response?.data?.errors?.[0]?.message || '无法读取产品草稿。请确认当前账号具备产品审核权限。';
  } finally {
    loading.value = false;
  }
}

onMounted(loadRecords);
</script>

<style scoped>
.review-page{display:grid;gap:20px;max-width:1120px;padding:4px 0 28px}.toolbar{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap}.toolbar p,.toolbar h2{margin:0}.toolbar h2{margin-top:5px;font-size:24px}.toolbar>div>p:last-child{margin-top:8px;color:var(--theme--foreground-subdued)}.eyebrow{color:var(--theme--primary);font:600 12px ui-monospace,monospace;letter-spacing:.08em}.toolbar button{padding:9px 13px;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);cursor:pointer}.toolbar button:disabled{cursor:not-allowed;opacity:.55}.summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.summary div,.panel,.empty,.error{border:1px solid var(--theme--border-color);border-radius:6px;background:var(--theme--background);padding:16px}.summary span{display:block;color:var(--theme--foreground-subdued);font-size:13px}.summary strong{display:block;margin-top:8px;font-size:28px}.panel h3{margin:0 0 14px;font-size:16px}.panel ul{display:grid;gap:9px;margin:0;padding:0;list-style:none}.panel li{display:grid;gap:3px;border-top:1px solid var(--theme--border-color);padding-top:10px}.panel li:first-child{border-top:0;padding-top:0}.panel li span,.empty{color:var(--theme--foreground-subdued);font-size:13px}.panel{overflow:auto}.panel table{width:100%;border-collapse:collapse;text-align:left}.panel th,.panel td{padding:12px 10px;border-bottom:1px solid var(--theme--border-color);vertical-align:top}.panel th{color:var(--theme--foreground-subdued);font-size:13px;font-weight:500}.compact{padding:12px}.error{border-color:var(--theme--danger);color:var(--theme--danger)}@media(max-width:620px){.toolbar{align-items:stretch}.toolbar button{width:100%}.summary{grid-template-columns:1fr}.panel{padding:4px}.panel h3{padding:12px 12px 0}.panel li{margin:0 12px}.panel th,.panel td{padding:11px 8px;white-space:normal;overflow-wrap:anywhere}}
</style>
