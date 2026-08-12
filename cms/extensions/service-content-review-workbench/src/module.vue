<template>
  <private-view title="服务支持审核">
    <div class="review-page">
      <header class="toolbar">
        <div>
          <p class="eyebrow">服务内容审核</p>
          <h2>服务支持内容审核准备</h2>
          <p>仅显示当前账号可读取的资料、网点与售后入口审核状态；请在原生内容详情中补全并走既有审核流程。</p>
        </div>
        <button type="button" :disabled="loading" @click="loadRecords">刷新</button>
      </header>

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div v-if="loading" class="empty">正在读取服务支持草稿...</div>
      <div v-else-if="!resources.length && !locations.length && !entries.length" class="empty">暂无可读取的服务支持草稿，或当前账号没有相应审核权限。</div>
      <template v-else>
        <section class="summary" aria-label="服务支持审核概览">
          <div><span>服务资料</span><strong>{{ resources.length }}</strong></div>
          <div><span>服务网点</span><strong>{{ locations.length }}</strong></div>
          <div><span>待处理项目</span><strong>{{ issueCount }}</strong></div>
        </section>
        <section class="panel" aria-label="服务资料审核项">
          <h3>服务资料</h3>
          <p v-if="!flaggedResources.length" class="empty compact">当前可读取资料没有自动识别的缺项。</p>
          <ul v-else><li v-for="item in flaggedResources" :key="item.id"><strong>{{ item.source_key || '未命名资料' }}</strong><span>{{ item.issues.join('；') }}</span></li></ul>
        </section>
        <section class="panel" aria-label="服务网点审核项">
          <h3>服务网点</h3>
          <p v-if="!flaggedLocations.length" class="empty compact">当前可读取网点没有自动识别的缺项。</p>
          <ul v-else><li v-for="item in flaggedLocations" :key="item.id"><strong>{{ item.region || '未填写区域' }} {{ item.city || '' }}</strong><span>{{ item.issues.join('；') }}</span></li></ul>
        </section>
        <section class="panel" aria-label="售后入口审核项">
          <h3>售后入口</h3>
          <table v-if="flaggedEntries.length">
            <thead><tr><th>入口类型</th><th>目标路径</th><th>审核提示</th><th>状态</th></tr></thead>
            <tbody><tr v-for="item in flaggedEntries" :key="item.id"><td>{{ item.entry_type || '未填写' }}</td><td>{{ item.route }}</td><td>{{ item.issues.join('；') }}</td><td>{{ item.status || '未知' }}/{{ item.publication_state || '未知' }}</td></tr></tbody>
          </table>
          <p v-else class="empty compact">当前可读取售后入口没有自动识别的缺项。</p>
        </section>
      </template>
    </div>
  </private-view>
</template>

<script setup>
import { useApi } from '@directus/extensions-sdk';
import { computed, onMounted, ref } from 'vue';
import { assessServiceEntry, assessServiceLocation, assessServiceResource } from '../../../reports/service-content-review-report.mjs';

const api = useApi();
const resources = ref([]);
const locations = ref([]);
const entries = ref([]);
const loading = ref(false);
const error = ref('');
const common = ['id', 'source_key', 'source_url', 'source_document', 'review_note', 'status', 'publication_state'];
const resourceFields = [...common, 'type', 'version', 'language', 'asset', 'updated_at'].join(',');
const locationFields = [...common, 'region', 'city', 'service_scope', 'contact', 'business_status', 'valid_until'].join(',');
const entryFields = ['id', 'entry_type', 'url', 'enabled', 'open_mode', 'fallback_phone', 'health_status', 'status', 'publication_state'].join(',');
const flaggedResources = computed(() => resources.value.map((item) => ({ ...item, issues: assessServiceResource(item) })).filter((item) => item.issues.length));
const flaggedLocations = computed(() => locations.value.map((item) => ({ ...item, issues: assessServiceLocation(item) })).filter((item) => item.issues.length));
const flaggedEntries = computed(() => entries.value.map((item) => {
  const result = assessServiceEntry(item);
  return { ...item, route: result.target.route, issues: result.issues };
}).filter((item) => item.issues.length));
const issueCount = computed(() => flaggedResources.value.length + flaggedLocations.value.length + flaggedEntries.value.length);

async function loadRecords() {
  loading.value = true;
  error.value = '';
  try {
    const [resourceResponse, locationResponse, entryResponse] = await Promise.all([
      api.get(`/items/service_resources?fields=${encodeURIComponent(resourceFields)}&limit=-1`),
      api.get(`/items/service_locations?fields=${encodeURIComponent(locationFields)}&limit=-1`),
      api.get(`/items/external_service_entries?fields=${encodeURIComponent(entryFields)}&limit=-1`)
    ]);
    resources.value = Array.isArray(resourceResponse.data?.data) ? resourceResponse.data.data : [];
    locations.value = Array.isArray(locationResponse.data?.data) ? locationResponse.data.data : [];
    entries.value = Array.isArray(entryResponse.data?.data) ? entryResponse.data.data : [];
  } catch (reason) {
    resources.value = [];
    locations.value = [];
    entries.value = [];
    error.value = reason?.response?.data?.errors?.[0]?.message || '无法读取服务支持草稿。请确认当前账号具备服务审核权限。';
  } finally {
    loading.value = false;
  }
}

onMounted(loadRecords);
</script>

<style scoped>
.review-page{display:grid;gap:20px;max-width:1120px;padding:4px 0 28px}.toolbar{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap}.toolbar p,.toolbar h2{margin:0}.toolbar h2{margin-top:5px;font-size:24px}.toolbar>div>p:last-child{margin-top:8px;color:var(--theme--foreground-subdued)}.eyebrow{color:var(--theme--primary);font:600 12px ui-monospace,monospace;letter-spacing:.08em}.toolbar button{padding:9px 13px;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);cursor:pointer}.toolbar button:disabled{cursor:not-allowed;opacity:.55}.summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.summary div,.panel,.empty,.error{border:1px solid var(--theme--border-color);border-radius:6px;background:var(--theme--background);padding:16px}.summary span{display:block;color:var(--theme--foreground-subdued);font-size:13px}.summary strong{display:block;margin-top:8px;font-size:28px}.panel h3{margin:0 0 14px;font-size:16px}.panel ul{display:grid;gap:9px;margin:0;padding:0;list-style:none}.panel li{display:grid;gap:3px;border-top:1px solid var(--theme--border-color);padding-top:10px}.panel li:first-child{border-top:0;padding-top:0}.panel li span,.empty{color:var(--theme--foreground-subdued);font-size:13px}.panel{overflow:auto}.panel table{width:100%;border-collapse:collapse;text-align:left}.panel th,.panel td{padding:12px 10px;border-bottom:1px solid var(--theme--border-color);vertical-align:top}.panel th{color:var(--theme--foreground-subdued);font-size:13px;font-weight:500}.compact{padding:12px}.error{border-color:var(--theme--danger);color:var(--theme--danger)}@media(max-width:620px){.toolbar{align-items:stretch}.toolbar button{width:100%}.summary{grid-template-columns:1fr}.panel{padding:4px}.panel h3{padding:12px 12px 0}.panel li{margin:0 12px}.panel th,.panel td{padding:11px 8px;white-space:normal;overflow-wrap:anywhere}}
</style>
