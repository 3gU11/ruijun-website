<template>
  <private-view title="售后入口归因">
    <div class="analytics-page">
      <header class="toolbar">
        <div>
          <p class="eyebrow">服务入口归因</p>
          <h2>官网到售后系统的匿名入口点击</h2>
          <p>仅汇总入口类型和来源页面，不显示客户、设备或问题内容。</p>
        </div>
        <button type="button" :disabled="loading" @click="loadAnalytics">刷新</button>
      </header>

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div v-if="loading" class="empty">正在汇总匿名入口数据...</div>
      <div v-else-if="!rows.length" class="empty">暂无入口点击记录。售后入口发布后，已确认的跳转会在此汇总。</div>
      <template v-else>
        <section class="summary" aria-label="入口点击汇总">
          <div><span>总点击</span><strong>{{ totalCount }}</strong></div>
          <div><span>入口类型</span><strong>{{ entryTypeCount }}</strong></div>
          <div><span>来源页面</span><strong>{{ sourcePageCount }}</strong></div>
        </section>
        <section class="results" aria-label="入口归因明细">
          <table>
            <thead><tr><th>入口类型</th><th>来源页面</th><th>点击次数</th></tr></thead>
            <tbody><tr v-for="row in rows" :key="`${row.entryType}-${row.sourcePath}`"><td>{{ entryLabel(row.entryType) }}</td><td><code>{{ row.sourcePath }}</code></td><td>{{ row.count }}</td></tr></tbody>
          </table>
        </section>
      </template>
    </div>
  </private-view>
</template>

<script setup>
import { useApi } from '@directus/extensions-sdk';
import { computed, onMounted, ref } from 'vue';

const api = useApi();
const rows = ref([]);
const loading = ref(false);
const error = ref('');
const totalCount = computed(() => rows.value.reduce((sum, row) => sum + row.count, 0));
const entryTypeCount = computed(() => new Set(rows.value.map((row) => row.entryType)).size);
const sourcePageCount = computed(() => new Set(rows.value.map((row) => row.sourcePath)).size);
const aggregateQuery = 'aggregate[count]=*&groupBy[]=entry_type&groupBy[]=source_page&limit=-1';

function entryLabel(value) {
  return { support: '售后服务首页', request: '发起维修申请', warranty: '保修状态核验', requests: '我的维修申请' }[value] || '未识别入口';
}

function normalizeRows(data) {
  if (!Array.isArray(data)) return [];
  return data.map((record) => ({
    entryType: String(record?.entry_type || ''),
    sourcePath: String(record?.source_page || ''),
    count: Number(record?.count?.['*'] || 0)
  })).filter((row) => row.entryType && row.sourcePath && Number.isFinite(row.count) && row.count > 0)
    .sort((left, right) => right.count - left.count || left.sourcePath.localeCompare(right.sourcePath, 'zh-CN'));
}

async function loadAnalytics() {
  loading.value = true;
  error.value = '';
  try {
    const response = await api.get(`/items/service_entry_clicks?${aggregateQuery}`);
    rows.value = normalizeRows(response.data?.data);
  } catch (reason) {
    rows.value = [];
    error.value = reason?.response?.data?.errors?.[0]?.message || '无法读取匿名入口汇总。请确认当前账号拥有只读统计权限。';
  } finally {
    loading.value = false;
  }
}

onMounted(loadAnalytics);
</script>

<style scoped>
.analytics-page{display:grid;gap:20px;max-width:1120px;padding:4px 0 28px}.toolbar{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap}.toolbar p,.toolbar h2{margin:0}.toolbar h2{margin-top:5px;font-size:24px}.toolbar>div>p:last-child{margin-top:8px;color:var(--theme--foreground-subdued)}.eyebrow{color:var(--theme--primary);font:600 12px ui-monospace,monospace;letter-spacing:.08em}.toolbar button{padding:9px 13px;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);cursor:pointer}.toolbar button:disabled{cursor:not-allowed;opacity:.55}.summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.summary div,.results,.empty,.error{border:1px solid var(--theme--border-color);border-radius:6px;background:var(--theme--background);padding:16px}.summary span{display:block;color:var(--theme--foreground-subdued);font-size:13px}.summary strong{display:block;margin-top:8px;font-size:28px}.results{overflow:auto}.results table{width:100%;border-collapse:collapse;text-align:left}.results th,.results td{padding:12px 10px;border-bottom:1px solid var(--theme--border-color)}.results th{color:var(--theme--foreground-subdued);font-size:13px;font-weight:500}.results td:last-child{text-align:right;font-variant-numeric:tabular-nums}.results code{font:13px ui-monospace,monospace}.empty{color:var(--theme--foreground-subdued)}.error{border-color:var(--theme--danger);color:var(--theme--danger)}@media(max-width:620px){.toolbar{align-items:stretch}.toolbar button{width:100%}.summary{grid-template-columns:1fr}.results{padding:4px}.results th,.results td{padding:11px 8px}.results code{white-space:normal;overflow-wrap:anywhere}}
</style>
