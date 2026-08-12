<template>
  <private-view title="发布就绪">
    <div class="page">
      <header class="toolbar">
        <div>
          <p class="eyebrow">发布就绪检查</p>
          <h2>发布前阻断项</h2>
          <p>先查看阻断原因，再从“打开内容”进入原生详情补充；本工作台只读，不会绕过审核流程。</p>
        </div>
        <button type="button" :disabled="loading" @click="load">刷新</button>
      </header>

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-else-if="loading" class="empty">正在读取发布就绪数据...</p>
      <template v-else>
        <section class="summary" aria-label="发布就绪概览">
          <div><span>可发布</span><strong>{{ report.summary.ready }}</strong></div>
          <div><span>被阻断</span><strong>{{ report.summary.blocked }}</strong></div>
          <div><span>当前显示</span><strong>{{ filteredItems.length }}</strong></div>
        </section>

        <section class="filters" aria-label="发布就绪筛选">
          <label>
            内容类型
            <select v-model="selectedType">
              <option value="">全部类型</option>
              <option v-for="type in typeOptions" :key="type" :value="type">{{ labels[type] || type }}</option>
            </select>
          </label>
          <label class="check-label">
            <input v-model="blockedOnly" type="checkbox">
            只看被阻断内容
          </label>
        </section>

        <div v-if="!filteredItems.length" class="empty">当前筛选条件下没有发布就绪记录。</div>
        <section v-else class="table-wrap" aria-label="发布就绪明细">
          <table>
            <thead>
              <tr><th>类型</th><th>内容</th><th>阻断项</th><th>操作</th></tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredItems" :key="itemKey(item)">
                <td>{{ labels[item.type] || item.type }}</td>
                <td>{{ item.label }}</td>
                <td><span v-if="item.blockers.length" class="blockers">{{ item.blockers.join('；') }}</span><span v-else>无</span></td>
                <td><a v-if="item.edit_path" class="edit-link" :href="item.edit_path">打开内容</a><span v-else class="muted">暂无入口</span></td>
              </tr>
            </tbody>
          </table>
        </section>
      </template>
    </div>
  </private-view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useApi } from '@directus/extensions-sdk';

const api = useApi();
const loading = ref(false);
const error = ref('');
const selectedType = ref('');
const blockedOnly = ref(false);
const labels = {
  series: '产品系列', product: '产品', parameter: '产品参数', case: '客户案例', manufacturing: '制造证据',
  qualification: '资质证书', milestone: '企业历程', service: '服务', knowledge: '公开常见问题', article: '新闻',
  page: '页面', setting: '全站设置', media: '公共媒体'
};
const report = ref({ summary: { ready: 0, blocked: 0 }, items: [] });
const typeOptions = computed(() => [...new Set(report.value.items.map((item) => item.type))]);
const filteredItems = computed(() => report.value.items.filter((item) => {
  if (selectedType.value && item.type !== selectedType.value) return false;
  if (blockedOnly.value && !item.blockers.length) return false;
  return true;
}));

function itemKey(item) {
  return item.type + ':' + (item.edit_path || item.label);
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const response = await api.get('/publication-readiness');
    report.value = response.data?.data || { summary: { ready: 0, blocked: 0 }, items: [] };
  } catch (reason) {
    report.value = { summary: { ready: 0, blocked: 0 }, items: [] };
    error.value = reason?.response?.data?.errors?.[0]?.message || '无法读取发布就绪数据。请确认当前账号具有发布权限。';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.page{display:grid;gap:18px;max-width:1180px;padding:4px 0 32px}.toolbar{display:flex;justify-content:space-between;align-items:end;gap:16px;flex-wrap:wrap}.toolbar p,.toolbar h2{margin:0}.toolbar h2{margin:6px 0;font-size:24px}.toolbar>div>p:last-child{margin-top:8px;color:var(--theme--foreground-subdued)}.eyebrow{color:var(--theme--primary);font:600 12px ui-monospace,monospace;letter-spacing:.08em}.toolbar button{padding:9px 13px;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);cursor:pointer}.toolbar button:disabled{cursor:not-allowed;opacity:.55}.summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.summary>div,.filters,.table-wrap,.empty,.error{border:1px solid var(--theme--border-color);border-radius:6px;background:var(--theme--background);padding:16px}.summary span{display:block;color:var(--theme--foreground-subdued);font-size:13px}.summary strong{display:block;margin-top:8px;font-size:28px}.filters{display:flex;align-items:end;gap:20px;flex-wrap:wrap}.filters label{display:grid;gap:7px;color:var(--theme--foreground-subdued);font-size:13px}.filters select{min-width:170px;padding:8px 10px;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);font:inherit}.filters .check-label{display:flex;align-items:center;gap:8px;min-height:36px}.filters input{width:16px;height:16px}.table-wrap{overflow:auto;padding:4px}.table-wrap table{width:100%;border-collapse:collapse;text-align:left}.table-wrap th,.table-wrap td{padding:12px 10px;border-bottom:1px solid var(--theme--border-color);vertical-align:top}.table-wrap th{color:var(--theme--foreground-subdued);font-size:13px;font-weight:500;white-space:nowrap}.blockers{color:var(--theme--danger)}.edit-link{color:var(--theme--primary);white-space:nowrap}.muted{color:var(--theme--foreground-subdued)}.empty{color:var(--theme--foreground-subdued)}.error{border-color:var(--theme--danger);color:var(--theme--danger)}@media(max-width:620px){.toolbar{align-items:stretch}.toolbar button{width:100%}.summary{grid-template-columns:1fr}.filters{align-items:stretch;flex-direction:column;gap:12px}.filters select{width:100%}.table-wrap{padding:0}.table-wrap th,.table-wrap td{padding:11px 8px;white-space:normal;overflow-wrap:anywhere}}
</style>
